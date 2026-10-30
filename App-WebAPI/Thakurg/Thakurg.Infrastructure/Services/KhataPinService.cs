using Microsoft.Extensions.Options;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

public class KhataPinService : IKhataPinService
{
    private readonly KhataPinOptions _options;

    private readonly IMessageService _messageService;

    private readonly IPasswordHasher _passwordHasher;

    private readonly IKhataAuditService _auditService;

    private readonly IKhataTokenService _tokenService;

    private readonly IKhataAuthRepository _authRepository;

    public KhataPinService(IOptions<KhataOptions> options, IPasswordHasher passwordHasher, IKhataTokenService tokenService, IKhataAuditService auditService, IMessageService messageService, IKhataAuthRepository authRepository)
    {
        _options = options.Value.Pin;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _auditService = auditService;
        _messageService = messageService;
        _authRepository = authRepository;
    }

    #region Public Methods

    // First PIN after login, or a new PIN after "Forgot PIN" (only within a few minutes of a fresh login); a reset logs out every other device.
    public async Task<KhataAuthResultDto> SetAsync(KhataCallerDto caller, string? pin, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(caller.UserId, cancellationToken);
        var now = DateTime.UtcNow;
        var replacing = user.PinHash is not null;
        if (replacing && !await IsFreshLoginAsync(caller, now, cancellationToken))
            throw new BusinessException(MessageCodes.KhataPinAlreadySet, 409);

        user.PinHash = _passwordHasher.Hash(RequireStrong(pin));
        user.PinSetOn = now;
        user.PinFailedCount = 0;
        user.PinLockedUntil = null;
        user.ModifiedOn = now;
        await _authRepository.AddPinAttemptAsync(NewAttempt(caller, KhataPinCheck.Set, true), cancellationToken);

        if (replacing)
            await _authRepository.RevokeSessionsAsync(user.Id, caller.SessionId, now, cancellationToken);

        await _auditService.WriteAsync(replacing ? KhataAuditActions.PinReset : KhataAuditActions.PinSet, user.Id, caller, null, cancellationToken);

        return _tokenService.CreateResult(user, caller.SessionId, true);
    }

    public async Task<KhataAuthResultDto> UnlockAsync(KhataCallerDto caller, string? pin, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(caller.UserId, cancellationToken);
        await CheckPinAsync(user, caller, KhataPinCheck.Unlock, pin, cancellationToken);

        return _tokenService.CreateResult(user, caller.SessionId, true);
    }

    public async Task<string> ChangeAsync(KhataCallerDto caller, string? newPin, string? proof, CancellationToken cancellationToken)
    {
        var pinHash = _passwordHasher.Hash(RequireStrong(newPin));
        await ConsumeProofAsync(caller, KhataPinPurpose.ChangePin, null, proof, cancellationToken);

        var user = await RequireUserAsync(caller.UserId, cancellationToken);
        user.PinHash = pinHash;
        user.PinSetOn = DateTime.UtcNow;
        user.ModifiedOn = user.PinSetOn;
        await _authRepository.SaveChangesAsync(cancellationToken);
        await _auditService.WriteAsync(KhataAuditActions.PinChanged, user.Id, caller, null, cancellationToken);

        return await _messageService.GetAsync(MessageCodes.KhataPinChanged);
    }

    public async Task<PinProofDto> CreateProofAsync(KhataCallerDto caller, PinProofRequestDto request, CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(request.Purpose))
            throw new BusinessException(MessageCodes.KhataPinRequired, 400);

        var user = await RequireUserAsync(caller.UserId, cancellationToken);
        await CheckPinAsync(user, caller, KhataPinCheck.Proof, request.Pin, cancellationToken);

        var proof = _tokenService.NewSecret();
        var entry = new KhataPinProof { UserId = user.Id, SessionId = caller.SessionId, Purpose = (byte)request.Purpose, TargetId = request.TargetId, ProofHash = _tokenService.Hash(proof), ExpiresOn = DateTime.UtcNow.AddSeconds(_options.ProofSeconds) };
        await _authRepository.AddPinProofAsync(entry, cancellationToken);

        return new PinProofDto { Proof = proof, ExpiresInSeconds = _options.ProofSeconds };
    }

    // A proof is valid once, for 2 minutes, for one user, one action and one target (for example one transaction).
    public async Task ConsumeProofAsync(KhataCallerDto caller, KhataPinPurpose purpose, int? targetId, string? proof, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var entry = string.IsNullOrEmpty(proof) ? null : await _authRepository.GetPinProofAsync(_tokenService.Hash(proof), cancellationToken);
        if (entry is null || entry.UserId != caller.UserId || entry.Purpose != (byte)purpose || entry.TargetId != targetId || entry.UsedOn is not null || entry.ExpiresOn <= now)
            throw new BusinessException(MessageCodes.KhataPinRequired, 403);

        entry.UsedOn = now;
        entry.ModifiedOn = now;
        await _authRepository.SaveChangesAsync(cancellationToken);
    }

    #endregion

    #region Private Methods

    // 0000/1111, 1234/4321-style runs, 4-digit years (1900-2099) and 112233-style pairs are too easy to guess.
    private static bool IsEasy(string pin)
    {
        var steps = pin.Zip(pin.Skip(1), (a, b) => b - a).Distinct().ToList();
        var run = steps.Count == 1 && Math.Abs(steps[0]) <= 1;
        var year = pin.Length == 4 && int.Parse(pin) is >= 1900 and <= 2099;
        var pairs = pin.Length == 6 && pin[0] == pin[1] && pin[2] == pin[3] && pin[4] == pin[5];

        return run || year || pairs;
    }

    private string RequireStrong(string? pin)
    {
        var value = pin ?? string.Empty;
        if (value.Length < _options.MinLength || value.Length > _options.MaxLength || !value.All(char.IsAsciiDigit) || IsEasy(value))
            throw new BusinessException(MessageCodes.KhataPinWeak, 400, _options.MinLength, _options.MaxLength);

        return value;
    }

    private static int MinutesLeft(DateTime until, DateTime now)
    {
        return Math.Max(1, (int)Math.Ceiling((until - now).TotalMinutes));
    }

    private async Task<KhataUser> RequireUserAsync(int userId, CancellationToken cancellationToken)
    {
        return await _authRepository.GetUserAsync(userId, cancellationToken) ?? throw new BusinessException(MessageCodes.KhataSessionInvalid, 401);
    }

    private static KhataPinAttempt NewAttempt(KhataCallerDto caller, KhataPinCheck check, bool success)
    {
        return new KhataPinAttempt { UserId = caller.UserId, SessionId = caller.SessionId, Purpose = (byte)check, Success = success, RequestIp = caller.Ip };
    }

    private async Task<bool> IsFreshLoginAsync(KhataCallerDto caller, DateTime now, CancellationToken cancellationToken)
    {
        var session = await _authRepository.GetSessionAsync(caller.SessionId, cancellationToken);

        return session is not null && session.LoggedInOn >= now.AddMinutes(-_options.FreshLoginMinutes);
    }

    // 5 wrong tries lock the PIN for 15 minutes; 10 wrong tries clear it and log out every device, so a new PIN needs a fresh login.
    private async Task CheckPinAsync(KhataUser user, KhataCallerDto caller, KhataPinCheck check, string? pin, CancellationToken cancellationToken)
    {
        if (user.PinHash is null)
            throw new BusinessException(MessageCodes.KhataPinNotSet, 409);

        var now = DateTime.UtcNow;
        if (user.PinLockedUntil > now)
            throw new BusinessException(MessageCodes.KhataPinLocked, 423, MinutesLeft(user.PinLockedUntil.Value, now));

        var success = _passwordHasher.Verify(pin ?? string.Empty, user.PinHash);
        user.PinFailedCount = success ? 0 : user.PinFailedCount + 1;
        user.PinLockedUntil = null;
        user.ModifiedOn = now;
        await _authRepository.AddPinAttemptAsync(NewAttempt(caller, check, success), cancellationToken);
        if (success)
            return;

        if (user.PinFailedCount >= _options.ResetAfterTries)
        {
            user.PinHash = null;
            user.PinFailedCount = 0;
            await _authRepository.SaveChangesAsync(cancellationToken);
            await _authRepository.RevokeSessionsAsync(user.Id, null, now, cancellationToken);
            await _auditService.WriteAsync(KhataAuditActions.PinCleared, user.Id, caller, null, cancellationToken);
            throw new BusinessException(MessageCodes.KhataPinReset, 401);
        }

        if (user.PinFailedCount % _options.MaxTries == 0)
        {
            user.PinLockedUntil = now.AddMinutes(_options.LockoutMinutes);
            await _authRepository.SaveChangesAsync(cancellationToken);
            await _auditService.WriteAsync(KhataAuditActions.PinLocked, user.Id, caller, null, cancellationToken);
            throw new BusinessException(MessageCodes.KhataPinLocked, 423, _options.LockoutMinutes);
        }

        throw new BusinessException(MessageCodes.KhataPinInvalid, 400, _options.MaxTries - user.PinFailedCount % _options.MaxTries);
    }

    #endregion
}
