using Microsoft.Extensions.Options;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

// The App Lock of My Tasks, the same mechanism as SnapKhata but its own PIN and sessions. While the lock is on (a PIN is set), every task, category, picture and settings call
// of a login session is refused with 423 until the PIN is entered; it stays open for the LockAfterMinutes of the user (at least one minute) after the last call.
// The PIN is hashed like a password. MaxAttempts wrong tries in a row block it for LockMinutes; MaxFailures in total clear it and end every login of the account.
public class TaskPinService : ITaskPinService
{
    private readonly IPasswordHasher _hasher;

    private readonly TasksPinOptions _options;

    private readonly IAuthRepository _authRepository;

    private readonly IAuthSessionCache _sessionCache;

    private readonly IMessageService _messageService;

    private readonly ITaskUserRepository _userRepository;

    public TaskPinService(IOptions<TasksOptions> options, ITaskUserRepository userRepository, IAuthRepository authRepository, IAuthSessionCache sessionCache, IPasswordHasher hasher, IMessageService messageService)
    {
        _options = options.Value.Pin;
        _userRepository = userRepository;
        _authRepository = authRepository;
        _sessionCache = sessionCache;
        _hasher = hasher;
        _messageService = messageService;
    }

    #region Public Methods

    public async Task EnsureUnlockedAsync(TaskCallerDto caller, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(caller, cancellationToken);

        if (user.PinHash is null)
            return;

        var now = DateTime.UtcNow;
        var session = await _userRepository.GetLockSessionAsync(caller.SessionId, cancellationToken);

        if (session?.UnlockedUntil is not { } until || until <= now)
            throw new BusinessException(MessageCodes.TasksPinRequired, 423);

        var next = now.AddMinutes(OpenMinutes(user));

        if ((next - until).TotalSeconds < _options.RenewSeconds)
            return;

        session.UnlockedUntil = next;
        session.ModifiedOn = now;
        await _userRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<TaskPinStatusDto> LockAsync(TaskCallerDto caller, CancellationToken cancellationToken)
    {
        var session = await _userRepository.GetLockSessionAsync(caller.SessionId, cancellationToken);

        if (session is not null)
        {
            session.UnlockedUntil = null;
            session.ModifiedOn = DateTime.UtcNow;
            await _userRepository.SaveChangesAsync(cancellationToken);
        }

        return await GetStatusAsync(caller, cancellationToken);
    }

    public async Task<TaskPinStatusDto> GetStatusAsync(TaskCallerDto caller, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(caller, cancellationToken);
        var session = await _userRepository.GetLockSessionAsync(caller.SessionId, cancellationToken);
        var now = DateTime.UtcNow;

        return new TaskPinStatusDto
        {
            Length = _options.Length,
            HasPin = user.PinHash is not null,
            Locked = user.PinHash is not null && (session?.UnlockedUntil is not { } until || until <= now),
            CanReset = await IsFreshLoginAsync(caller, cancellationToken),
            LockAfterMinutes = user.LockAfterMinutes,
            LockedUntil = user.PinLockedUntil > now ? user.PinLockedUntil : null
        };
    }

    public async Task<TaskPinStatusDto> VerifyAsync(TaskCallerDto caller, TaskPinRequestDto request, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(caller, cancellationToken);

        if (user.PinHash is null)
            throw new BusinessException(MessageCodes.TasksPinNotSet, 400);

        await CheckAsync(user, caller, request.Pin, cancellationToken);
        await SetSessionAsync(user, caller, true, cancellationToken);

        return await GetStatusAsync(caller, cancellationToken);
    }

    public async Task<ServiceResultDto<TaskPinStatusDto>> SetAsync(TaskCallerDto caller, TaskPinRequestDto request, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(caller, cancellationToken);
        var pin = request.Pin.Trim();

        if (pin.Length != _options.Length || !pin.All(char.IsAsciiDigit))
            throw new BusinessException(MessageCodes.TasksPinInvalid, 400, _options.Length);

        if (IsWeak(pin))
            throw new BusinessException(MessageCodes.TasksPinWeak, 400);

        if (user.PinHash is not null && !await IsFreshLoginAsync(caller, cancellationToken))
            await CheckAsync(user, caller, request.CurrentPin ?? throw new BusinessException(MessageCodes.TasksPinCurrent, 400), cancellationToken);

        user.PinHash = _hasher.Hash(pin);
        user.PinFailedCount = 0;
        user.PinLockedUntil = null;
        user.ModifiedBy = caller.AccountUserId;
        user.ModifiedOn = DateTime.UtcNow;
        await _userRepository.SaveChangesAsync(cancellationToken);
        await SetSessionAsync(user, caller, true, cancellationToken);

        return new ServiceResultDto<TaskPinStatusDto> { Data = await GetStatusAsync(caller, cancellationToken), Message = await _messageService.GetAsync(MessageCodes.TasksPinSaved) };
    }

    // Turning the lock off needs the PIN (or a fresh login, like a reset).
    public async Task<ServiceResultDto<TaskPinStatusDto>> RemoveAsync(TaskCallerDto caller, TaskPinRequestDto request, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(caller, cancellationToken);

        if (user.PinHash is null)
            throw new BusinessException(MessageCodes.TasksPinNotSet, 400);

        if (!await IsFreshLoginAsync(caller, cancellationToken))
            await CheckAsync(user, caller, request.Pin, cancellationToken);

        user.PinHash = null;
        user.PinFailedCount = 0;
        user.PinLockedUntil = null;
        user.ModifiedBy = caller.AccountUserId;
        user.ModifiedOn = DateTime.UtcNow;
        await _userRepository.SaveChangesAsync(cancellationToken);

        return new ServiceResultDto<TaskPinStatusDto> { Data = await GetStatusAsync(caller, cancellationToken), Message = await _messageService.GetAsync(MessageCodes.TasksPinRemoved) };
    }

    #endregion

    #region Private Methods

    // All the same digit, or a straight run up or down (1234, 9876).
    private static bool IsWeak(string pin)
    {
        var steps = pin.Zip(pin.Skip(1), (a, b) => b - a).Distinct().ToList();

        return steps.Count == 1 && steps[0] is 0 or 1 or -1;
    }

    private static int OpenMinutes(TaskUser user)
    {
        return Math.Max(1, user.LockAfterMinutes);
    }

    // A login younger than ResetMinutes proves the password again, so the PIN may be replaced or removed without the old one.
    private async Task<bool> IsFreshLoginAsync(TaskCallerDto caller, CancellationToken cancellationToken)
    {
        var session = await _authRepository.GetSessionAsync(caller.SessionId, cancellationToken);

        return session is not null && session.LoggedInOn > DateTime.UtcNow.AddMinutes(-_options.ResetMinutes);
    }

    private async Task<TaskUser> RequireUserAsync(TaskCallerDto caller, CancellationToken cancellationToken)
    {
        return await _userRepository.GetAsync(caller.UserId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);
    }

    private async Task CheckAsync(TaskUser user, TaskCallerDto caller, string pin, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        if (user.PinLockedUntil > now)
            throw new BusinessException(MessageCodes.TasksPinLocked, 429, (int)Math.Ceiling((user.PinLockedUntil.Value - now).TotalMinutes));

        if (user.PinHash is not null && _hasher.Verify(pin.Trim(), user.PinHash))
        {
            if (user.PinFailedCount == 0)
                return;

            user.PinFailedCount = 0;
            await _userRepository.SaveChangesAsync(cancellationToken);
            return;
        }

        user.PinFailedCount++;
        user.ModifiedOn = now;

        if (user.PinFailedCount >= _options.MaxFailures)
        {
            user.PinHash = null;
            user.PinFailedCount = 0;
            user.PinLockedUntil = null;
            await _userRepository.SaveChangesAsync(cancellationToken);
            await _authRepository.RevokeSessionsAsync(caller.AccountUserId, null, now, cancellationToken);
            _sessionCache.Forget(caller.AccountUserId);
            throw new BusinessException(MessageCodes.TasksPinCleared, 401);
        }

        if (user.PinFailedCount % _options.MaxAttempts == 0)
        {
            user.PinLockedUntil = now.AddMinutes(_options.LockMinutes);
            await _userRepository.SaveChangesAsync(cancellationToken);
            throw new BusinessException(MessageCodes.TasksPinLocked, 429, _options.LockMinutes);
        }

        await _userRepository.SaveChangesAsync(cancellationToken);
        throw new BusinessException(MessageCodes.TasksPinWrong, 400, _options.MaxAttempts - user.PinFailedCount % _options.MaxAttempts);
    }

    private async Task SetSessionAsync(TaskUser user, TaskCallerDto caller, bool unlocked, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var until = unlocked ? now.AddMinutes(OpenMinutes(user)) : (DateTime?)null;
        var session = await _userRepository.GetLockSessionAsync(caller.SessionId, cancellationToken);

        if (session is null)
        {
            await _userRepository.AddLockSessionAsync(new TaskLockSession { UserId = user.Id, SessionId = caller.SessionId, UnlockedUntil = until, CreatedBy = caller.AccountUserId }, cancellationToken);
            return;
        }

        session.UnlockedUntil = until;
        session.ModifiedOn = now;
        await _userRepository.SaveChangesAsync(cancellationToken);
    }

    #endregion
}
