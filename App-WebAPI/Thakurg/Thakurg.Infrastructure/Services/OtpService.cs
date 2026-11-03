using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;
using Thakurg.Infrastructure.Email;

namespace Thakurg.Infrastructure.Services;

// Login with a one-time code, sent by e-mail or SMS, for the apps in Auth:Otp:Apps. The code is stored only as an HMAC (keyed with Auth:Jwt:Secret) and compared in constant time.
// A code is sent to any valid address, so the answer never shows whether an account exists; the account is found or made when the code is verified.
public class OtpService : IOtpService
{
    private const int MaxIpLength = 45;

    private readonly AuthOptions _options;

    private readonly ISmsSender _smsSender;

    private readonly IAuthService _authService;

    private readonly IEmailSender _emailSender;

    private readonly IOtpRepository _otpRepository;

    private readonly IMessageService _messageService;

    public OtpService(IOptions<AuthOptions> options, IOtpRepository otpRepository, IAuthService authService, IEmailSender emailSender, ISmsSender smsSender, IMessageService messageService)
    {
        _options = options.Value;
        _otpRepository = otpRepository;
        _authService = authService;
        _emailSender = emailSender;
        _smsSender = smsSender;
        _messageService = messageService;
    }

    #region Public Methods

    // A wrong code counts towards Auth:Otp:MaxAttempts; after that, or once it expired or was used, only a new code works.
    public async Task<SignInDto> VerifyAsync(OtpVerifyRequestDto request, AuthCallerDto caller, CancellationToken cancellationToken)
    {
        var app = RequireApp(request.App);
        var (channel, destination) = Destination(request.Channel, request.Destination);
        var now = DateTime.UtcNow;
        var code = await _otpRepository.GetLatestAsync(destination, channel, app, cancellationToken);

        if (code is null || code.ConsumedOn is not null || code.ExpiresOn <= now || code.Attempts >= _options.Otp.MaxAttempts)
            throw new BusinessException(MessageCodes.AuthOtpInvalid, 400);

        if (!Matches(code, (request.Code ?? string.Empty).Trim()))
        {
            await _otpRepository.AddAttemptAsync(code.Id, now, cancellationToken);
            throw new BusinessException(MessageCodes.AuthOtpInvalid, 400);
        }

        if (!await _otpRepository.TryConsumeAsync(code.Id, now, cancellationToken))
            throw new BusinessException(MessageCodes.AuthOtpInvalid, 400);

        return await _authService.OtpSignInAsync(channel, destination, caller, cancellationToken);
    }

    // One code per Auth:Otp:ResendSeconds and at most MaxPerDestination codes per DestinationWindowMinutes for one address (the per-IP limit is the auth-otp rate-limit policy).
    public async Task<ServiceResultDto<OtpRequestDto>> RequestAsync(OtpCodeRequestDto request, AuthCallerDto caller, CancellationToken cancellationToken)
    {
        var app = RequireApp(request.App);
        var (channel, destination) = Destination(request.Channel, request.Destination);
        var now = DateTime.UtcNow;
        var lastSentOn = await _otpRepository.GetLastSentOnAsync(destination, cancellationToken);
        var waitSeconds = lastSentOn is null ? 0 : (int)Math.Ceiling((lastSentOn.Value.AddSeconds(_options.Otp.ResendSeconds) - now).TotalSeconds);

        if (waitSeconds > 0)
            throw new BusinessException(MessageCodes.AuthOtpWait, 429, waitSeconds);

        if (await _otpRepository.CountSinceAsync(destination, now.AddMinutes(-_options.Otp.DestinationWindowMinutes), cancellationToken) >= _options.Otp.MaxPerDestination)
            throw new BusinessException(MessageCodes.TooManyRequests, 429);

        var plainCode = NewCode();
        var code = new OneTimeCode { Destination = destination, Channel = channel, AppCode = app, CodeHash = Hash(channel, destination, app, plainCode), ExpiresOn = now.AddMinutes(_options.Otp.CodeMinutes), RequestIp = caller.Ip is { Length: > MaxIpLength } ip ? ip[..MaxIpLength] : caller.Ip };
        await _otpRepository.AddAsync(code, cancellationToken);

        try
        {
            await SendAsync(channel, destination, plainCode, cancellationToken);
        }
        catch
        {
            await _otpRepository.InvalidateAsync(code.Id, DateTime.UtcNow, CancellationToken.None);
            throw;
        }

        var result = new OtpRequestDto { ExpiresInSeconds = _options.Otp.CodeMinutes * 60, ResendInSeconds = _options.Otp.ResendSeconds };

        return new ServiceResultDto<OtpRequestDto> { Data = result, Message = await _messageService.GetAsync(MessageCodes.AuthOtpSent, _options.Otp.CodeMinutes) };
    }

    #endregion

    #region Private Methods

    private string NewCode()
    {
        var length = _options.Otp.CodeLength;

        return RandomNumberGenerator.GetInt32(0, (int)Math.Pow(10, length)).ToString("D" + length);
    }

    private string RequireApp(string? app)
    {
        var code = (app ?? string.Empty).Trim().ToLowerInvariant();

        return _options.Otp.Apps.Contains(code) ? code : throw new BusinessException(MessageCodes.AuthOtpAppInvalid, 400);
    }

    private bool Matches(OneTimeCode code, string plainCode)
    {
        var expected = Encoding.ASCII.GetBytes(code.CodeHash);
        var actual = Encoding.ASCII.GetBytes(Hash(code.Channel, code.Destination, code.AppCode, plainCode));

        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    private string Hash(string channel, string destination, string app, string plainCode)
    {
        var key = Encoding.UTF8.GetBytes(_options.Jwt.Secret);

        return Convert.ToHexStringLower(HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(channel + "|" + destination + "|" + app + "|" + plainCode)));
    }

    // The channel and the address in their stored form: a lower-cased e-mail address, or a mobile number in E.164 (+91 for 10 digits).
    private static (string Channel, string Destination) Destination(string? channel, string? destination)
    {
        var name = (channel ?? string.Empty).Trim().ToLowerInvariant();
        var address = name switch
        {
            OtpChannels.Email => EmailAddress.Normalize(destination),
            OtpChannels.Sms => KhataIdentifier.Mobile(destination),
            _ => null
        };

        return address is null ? throw new BusinessException(MessageCodes.AuthOtpDestinationInvalid, 400) : (name, address);
    }

    private async Task SendAsync(string channel, string destination, string plainCode, CancellationToken cancellationToken)
    {
        if (channel == OtpChannels.Sms)
        {
            await _smsSender.SendAsync(destination, await _messageService.GetAsync(MessageCodes.AuthOtpSmsText, plainCode, _options.Otp.CodeMinutes), cancellationToken);
            return;
        }

        var subject = await _messageService.GetAsync(MessageCodes.AuthOtpEmailSubject, plainCode);
        var body = await _messageService.GetAsync(MessageCodes.AuthOtpEmailBody, plainCode, _options.Otp.CodeMinutes);
        await _emailSender.SendAsync(destination, subject, EmailHtml.Paragraphs([body], _messageService.CurrentLanguage() == "ar"), cancellationToken);
    }

    #endregion
}
