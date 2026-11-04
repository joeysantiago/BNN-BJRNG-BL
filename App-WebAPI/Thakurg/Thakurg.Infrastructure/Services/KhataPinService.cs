using Microsoft.Extensions.Options;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

// The app lock PIN of the installed app (KhataUsers.PinHash). The server checks it, so clearing the browser cannot skip it.
// Khata:Pin:MaxAttempts wrong tries in a row lock it for LockMinutes; MaxFailures wrong tries in all clear it and end every session of the user.
// Changing it needs the current PIN, unless the login is younger than ResetMinutes (Forgot PIN: log in again, then choose a new one).
public class KhataPinService : IKhataPinService
{
    private readonly KhataPinOptions _options;

    private readonly IKhataCommonServices _common;

    private readonly IAuthRepository _authRepository;

    private readonly IAuthSessionCache _sessionCache;

    private readonly IPasswordHasher _passwordHasher;

    private readonly IKhataUserRepository _userRepository;

    public KhataPinService(IOptions<KhataOptions> options, IKhataUserRepository userRepository, IAuthRepository authRepository, IAuthSessionCache sessionCache, IPasswordHasher passwordHasher, IKhataCommonServices common)
    {
        _options = options.Value.Pin;
        _userRepository = userRepository;
        _authRepository = authRepository;
        _sessionCache = sessionCache;
        _passwordHasher = passwordHasher;
        _common = common;
    }

    #region Public Methods

    public async Task<KhataPinStatusDto> GetAsync(KhataCallerDto caller, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(caller, cancellationToken);

        return await ToDtoAsync(user, caller, cancellationToken);
    }

    public async Task<KhataPinStatusDto> VerifyAsync(KhataCallerDto caller, KhataPinRequestDto request, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(caller, cancellationToken);

        if (user.PinHash is null)
            throw new BusinessException(MessageCodes.KhataPinNotSet, 409);

        await CheckAsync(user, caller, request.Pin ?? string.Empty, cancellationToken);

        return await ToDtoAsync(user, caller, cancellationToken);
    }

    // A first PIN needs no old one. To change it, the current PIN is checked (a wrong one counts as a wrong try) unless the login is fresh.
    public async Task<ServiceResultDto<KhataPinStatusDto>> SetAsync(KhataCallerDto caller, KhataPinRequestDto request, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(caller, cancellationToken);
        var pin = request.Pin ?? string.Empty;

        if (pin.Length != _options.Length || !pin.All(char.IsAsciiDigit))
            throw new BusinessException(MessageCodes.KhataPinInvalid, 400, _options.Length);

        if (IsWeak(pin))
            throw new BusinessException(MessageCodes.KhataPinWeak, 400);

        if (user.PinHash is not null && !await IsFreshLoginAsync(caller, cancellationToken))
            await CheckAsync(user, caller, request.CurrentPin ?? string.Empty, cancellationToken);

        user.PinHash = _passwordHasher.Hash(pin);
        user.PinFailedCount = 0;
        user.PinLockedUntil = null;
        user.ModifiedBy = user.Id;
        user.ModifiedOn = DateTime.UtcNow;
        await _userRepository.SaveChangesAsync(cancellationToken);
        await _common.Audit.WriteAsync(KhataAuditActions.PinSet, user.Id, caller, null, cancellationToken);

        return new ServiceResultDto<KhataPinStatusDto> { Data = await ToDtoAsync(user, caller, cancellationToken), Message = await _common.Messages.GetAsync(MessageCodes.KhataPinSaved) };
    }

    #endregion

    #region Private Methods

    // Every digit the same (1111) or one straight run up or down (1234, 9876).
    private static bool IsWeak(string pin)
    {
        var steps = pin.Zip(pin.Skip(1), (a, b) => b - a).Distinct().ToList();

        return steps.Count == 1 && Math.Abs(steps[0]) <= 1;
    }

    private async Task<bool> IsFreshLoginAsync(KhataCallerDto caller, CancellationToken cancellationToken)
    {
        var session = await _authRepository.GetSessionAsync(caller.SessionId, cancellationToken);

        return session is not null && session.LoggedInOn >= DateTime.UtcNow.AddMinutes(-_options.ResetMinutes);
    }

    private async Task<KhataUser> RequireUserAsync(KhataCallerDto caller, CancellationToken cancellationToken)
    {
        return await _userRepository.GetUserAsync(caller.UserId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);
    }

    // A right PIN clears the wrong tries. A wrong one is counted: every MaxAttempts in a row lock the PIN for LockMinutes, and MaxFailures in all clear it
    // and log the user out everywhere (401, so the app goes back to the login page).
    private async Task CheckAsync(KhataUser user, KhataCallerDto caller, string pin, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        if (user.PinLockedUntil > now)
            throw new BusinessException(MessageCodes.KhataPinLocked, 423, (int)Math.Ceiling((user.PinLockedUntil.Value - now).TotalMinutes));

        if (_passwordHasher.Verify(pin, user.PinHash!))
        {
            if (user.PinFailedCount == 0 && user.PinLockedUntil is null)
                return;

            user.PinFailedCount = 0;
            user.PinLockedUntil = null;
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
            await _authRepository.RevokeSessionsAsync(user.UserId, null, now, cancellationToken);
            _sessionCache.Forget(user.UserId);
            await _common.Audit.WriteAsync(KhataAuditActions.PinCleared, user.Id, caller, null, cancellationToken);

            throw new BusinessException(MessageCodes.KhataPinCleared, 401);
        }

        if (user.PinFailedCount % _options.MaxAttempts == 0)
        {
            user.PinLockedUntil = now.AddMinutes(_options.LockMinutes);
            await _userRepository.SaveChangesAsync(cancellationToken);
            await _common.Audit.WriteAsync(KhataAuditActions.PinLocked, user.Id, caller, null, cancellationToken);

            throw new BusinessException(MessageCodes.KhataPinLocked, 423, _options.LockMinutes);
        }

        await _userRepository.SaveChangesAsync(cancellationToken);

        throw new BusinessException(MessageCodes.KhataPinWrong, 400, _options.MaxAttempts - user.PinFailedCount % _options.MaxAttempts);
    }

    private async Task<KhataPinStatusDto> ToDtoAsync(KhataUser user, KhataCallerDto caller, CancellationToken cancellationToken)
    {
        var lockedUntil = user.PinLockedUntil > DateTime.UtcNow ? user.PinLockedUntil : null;

        return new KhataPinStatusDto { Length = _options.Length, HasPin = user.PinHash is not null, CanReset = await IsFreshLoginAsync(caller, cancellationToken), LockAfterMinutes = _options.LockAfterMinutes, LockedUntil = lockedUntil };
    }

    #endregion
}
