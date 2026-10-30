using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

public class KhataAuthService : IKhataAuthService
{
    private const int DeviceIdLength = 64;

    private readonly KhataOptions _options;

    private const int UserAgentLength = 300;

    private readonly IKhataOtpSender _otpSender;

    private readonly IMessageService _messageService;

    private readonly IKhataAuditService _auditService;

    private readonly IKhataTokenService _tokenService;

    private readonly IKhataAuthRepository _authRepository;

    private static readonly Regex EmailPattern = new(@"^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$", RegexOptions.Compiled);

    public KhataAuthService(IOptions<KhataOptions> options, IKhataOtpSender otpSender, IKhataTokenService tokenService, IKhataAuditService auditService, IMessageService messageService, IKhataAuthRepository authRepository)
    {
        _options = options.Value;
        _otpSender = otpSender;
        _tokenService = tokenService;
        _auditService = auditService;
        _messageService = messageService;
        _authRepository = authRepository;
    }

    #region Public Methods

    public async Task<string> LogoutAsync(KhataCallerDto caller, CancellationToken cancellationToken)
    {
        var session = await _authRepository.GetSessionAsync(caller.SessionId, cancellationToken);
        if (session is not null && session.UserId == caller.UserId)
        {
            session.RevokedOn = DateTime.UtcNow;
            session.ModifiedOn = session.RevokedOn;
            await _authRepository.SaveChangesAsync(cancellationToken);
        }

        await _auditService.WriteAsync(KhataAuditActions.LoggedOut, caller.UserId, caller, null, cancellationToken);

        return await _messageService.GetAsync(MessageCodes.KhataLoggedOut);
    }

    // Only reachable with an unlocked token (KhataPolicies.Unlocked), so the new token stays unlocked while the app is in use.
    public async Task<KhataAuthResultDto> RenewAsync(KhataCallerDto caller, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(caller.UserId, cancellationToken);

        return _tokenService.CreateResult(user, caller.SessionId, true);
    }

    public async Task<string> SendOtpAsync(OtpSendRequestDto request, KhataCallerDto caller, CancellationToken cancellationToken)
    {
        var (identifier, channel) = Normalize(request.Identifier);
        var now = DateTime.UtcNow;
        var lastSentOn = await _authRepository.GetLastOtpOnAsync(identifier, cancellationToken);
        var wait = lastSentOn is null ? 0 : _options.Otp.CooldownSeconds - (int)(now - lastSentOn.Value).TotalSeconds;
        if (wait > 0)
            throw new BusinessException(MessageCodes.KhataOtpTooSoon, 429, wait);

        var lastTenMinutes = await _authRepository.CountOtpsSinceAsync(identifier, now.AddMinutes(-10), cancellationToken);
        var lastDay = await _authRepository.CountOtpsSinceAsync(identifier, now.AddDays(-1), cancellationToken);
        if (lastTenMinutes >= _options.Otp.PerTenMinutes || lastDay >= _options.Otp.PerDay)
            throw new BusinessException(MessageCodes.KhataOtpLimit, 429);

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var otp = new KhataOtp { Identifier = identifier, Channel = (byte)channel, CodeHash = _tokenService.HashOtp(identifier, code), ExpiresOn = now.AddMinutes(_options.Otp.ExpiryMinutes), RequestIp = caller.Ip };
        await _authRepository.AddOtpAsync(otp, cancellationToken);
        await _otpSender.SendAsync(channel, identifier, code, cancellationToken);
        await _auditService.WriteAsync(KhataAuditActions.OtpSent, null, caller, new { Channel = channel.ToString() }, cancellationToken);

        return await _messageService.GetAsync(MessageCodes.KhataOtpSent, _options.Otp.ExpiryMinutes);
    }

    // Every app open starts here: the refresh token is rotated, and the new access token is always locked (PIN needed).
    public async Task<KhataSignInDto> RefreshAsync(string? refreshToken, KhataCallerDto caller, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(refreshToken))
            throw new BusinessException(MessageCodes.KhataSessionInvalid, 401);

        var now = DateTime.UtcNow;
        var session = await _authRepository.GetSessionByTokenAsync(_tokenService.Hash(refreshToken), cancellationToken);
        if (session is null || session.RevokedOn is not null || session.ExpiresOn <= now)
            throw new BusinessException(MessageCodes.KhataSessionInvalid, 401);

        var user = await RequireUserAsync(session.UserId, cancellationToken);
        var newToken = _tokenService.NewSecret();
        session.RefreshTokenHash = _tokenService.Hash(newToken);
        session.ExpiresOn = now.AddDays(_options.Jwt.RefreshDays);
        session.ModifiedOn = now;
        await _authRepository.SaveChangesAsync(cancellationToken);

        return new KhataSignInDto { Auth = _tokenService.CreateResult(user, session.Id, false), RefreshToken = newToken, RefreshExpiresOn = session.ExpiresOn };
    }

    public async Task<KhataSignInDto> VerifyOtpAsync(OtpVerifyRequestDto request, KhataCallerDto caller, CancellationToken cancellationToken)
    {
        var (identifier, channel) = Normalize(request.Identifier);
        var now = DateTime.UtcNow;
        var otp = await _authRepository.GetActiveOtpAsync(identifier, now, cancellationToken);
        if (otp is null || otp.Attempts >= _options.Otp.MaxAttempts)
            throw new BusinessException(MessageCodes.KhataOtpInvalid, 400);

        if (!SameHash(otp.CodeHash, _tokenService.HashOtp(identifier, request.Code.Trim())))
        {
            otp.Attempts++;
            await _authRepository.SaveChangesAsync(cancellationToken);
            throw new BusinessException(MessageCodes.KhataOtpInvalid, 400);
        }

        otp.ConsumedOn = now;
        var user = await FindOrCreateUserAsync(identifier, channel, now, cancellationToken);
        var signIn = await StartSessionAsync(user, caller, now, cancellationToken);
        await _auditService.WriteAsync(KhataAuditActions.LoggedIn, user.Id, caller, new { Channel = channel.ToString() }, cancellationToken);

        return signIn;
    }

    #endregion

    #region Private Methods

    private static string? Truncate(string? value, int length)
    {
        return value is { Length: > 0 } text ? text[..Math.Min(text.Length, length)] : null;
    }

    private static bool SameHash(string stored, string computed)
    {
        return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(stored), Encoding.ASCII.GetBytes(computed));
    }

    // Email is lower-cased. A mobile number becomes E.164; a 10-digit number (or 0 + 10 digits) is taken as Indian (+91).
    private static (string Identifier, KhataOtpChannel Channel) Normalize(string? value)
    {
        var text = (value ?? string.Empty).Trim();
        if (text.Contains('@'))
        {
            var email = text.ToLowerInvariant();
            if (email.Length > 256 || !EmailPattern.IsMatch(email))
                throw new BusinessException(MessageCodes.KhataIdentifierInvalid, 400);

            return (email, KhataOtpChannel.Email);
        }

        var digits = new string(text.Where(char.IsAsciiDigit).ToArray());
        var mobile = text.StartsWith('+') ? "+" + digits : digits.Length switch
        {
            10 => "+91" + digits,
            11 when digits[0] == '0' => "+91" + digits[1..],
            12 when digits.StartsWith("91") => "+" + digits,
            _ => string.Empty
        };

        if (mobile.Length is < 9 or > 16 || text.Any(c => !char.IsAsciiDigit(c) && c is not ('+' or ' ' or '-' or '(' or ')')))
            throw new BusinessException(MessageCodes.KhataIdentifierInvalid, 400);

        return (mobile, KhataOtpChannel.Sms);
    }

    private async Task<KhataUser> RequireUserAsync(int userId, CancellationToken cancellationToken)
    {
        return await _authRepository.GetUserAsync(userId, cancellationToken) ?? throw new BusinessException(MessageCodes.KhataSessionInvalid, 401);
    }

    private async Task<KhataSignInDto> StartSessionAsync(KhataUser user, KhataCallerDto caller, DateTime now, CancellationToken cancellationToken)
    {
        var refreshToken = _tokenService.NewSecret();
        var session = new KhataSession { UserId = user.Id, RefreshTokenHash = _tokenService.Hash(refreshToken), DeviceId = Truncate(caller.DeviceId, DeviceIdLength) ?? _tokenService.NewSecret()[..16], UserAgent = Truncate(caller.UserAgent, UserAgentLength), LoggedInOn = now, ExpiresOn = now.AddDays(_options.Jwt.RefreshDays) };
        await _authRepository.AddSessionAsync(session, cancellationToken);

        return new KhataSignInDto { Auth = _tokenService.CreateResult(user, session.Id, false), RefreshToken = refreshToken, RefreshExpiresOn = session.ExpiresOn };
    }

    // The same person keeps one account: an email login finds the user by email, a mobile login by mobile.
    private async Task<KhataUser> FindOrCreateUserAsync(string identifier, KhataOtpChannel channel, DateTime now, CancellationToken cancellationToken)
    {
        var email = channel == KhataOtpChannel.Email ? identifier : null;
        var mobile = channel == KhataOtpChannel.Sms ? identifier : null;
        var user = await _authRepository.FindUserAsync(email, mobile, cancellationToken);
        if (user is null)
        {
            user = new KhataUser { Email = email, Mobile = mobile };
            await _authRepository.AddUserAsync(user, cancellationToken);
        }

        if (channel == KhataOtpChannel.Email)
        {
            user.EmailVerifiedOn ??= now;
        }
        else
        {
            user.MobileVerifiedOn ??= now;
        }

        await _authRepository.SaveChangesAsync(cancellationToken);

        return user;
    }

    #endregion
}
