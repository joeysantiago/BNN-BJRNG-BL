using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Mail;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;
using Thakurg.Infrastructure.Email;

namespace Thakurg.Infrastructure.Services;

// Login with a one-time code, sent by e-mail or SMS, for the apps in Auth:Otp:Apps. The code is stored only as an HMAC (keyed with Auth:Jwt:Secret) and compared in constant time.
// A code is sent to any valid address, so the answer never shows whether an account exists; the account is found or made when the code is verified.
// Limits per address are counted in OneTimeCodes (so they hold across API instances); the per-IP limit is the auth-otp rate-limit policy.
public class OtpService : IOtpService
{
    private readonly AuthOptions _options;

    private readonly ISmsSender _smsSender;

    private readonly IAuthService _authService;

    private readonly IEmailSender _emailSender;

    private readonly IOtpRepository _otpRepository;

    private readonly IMessageService _messageService;

    private static readonly TimeSpan Day = TimeSpan.FromDays(1);

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

    // Auth:Otp:MaxAttempts wrong tries use the code up; after that, or once it expired or was used, only a new code works.
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

    public async Task<ServiceResultDto<OtpRequestDto>> RequestAsync(OtpCodeRequestDto request, AuthCallerDto caller, CancellationToken cancellationToken)
    {
        var app = RequireApp(request.App);
        var (channel, destination) = Destination(request.Channel, request.Destination);
        var now = DateTime.UtcNow;
        await RequireAllowedAsync(destination, now, cancellationToken);
        var plainCode = NewCode();
        var ipLength = _options.Otp.IpLength;
        var code = new OneTimeCode { Destination = destination, Channel = channel, AppCode = app, CodeHash = Hash(channel, destination, app, plainCode), ExpiresOn = now.AddMinutes(_options.Otp.CodeMinutes), RequestIp = caller.Ip is { } ip && ip.Length > ipLength ? ip[..ipLength] : caller.Ip };
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

        var result = new OtpRequestDto { ExpiresInSeconds = (int)TimeSpan.FromMinutes(_options.Otp.CodeMinutes).TotalSeconds, ResendInSeconds = _options.Otp.ResendSeconds };

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

    // The time until the oldest of the last "limit" codes leaves the window; nothing when fewer than "limit" were sent in it.
    private static TimeSpan WaitFor(List<DateTime> sentOn, DateTime now, TimeSpan window, int limit)
    {
        var inWindow = sentOn.Where(s => s > now - window).Order().ToList();

        return inWindow.Count < limit ? TimeSpan.Zero : inWindow[inWindow.Count - limit] + window - now;
    }

    // The channel and the address in their stored form: a lower-cased e-mail address, or a mobile number in E.164 (+ and digits only; +91 for 10 digits).
    private static (string Channel, string Destination) Destination(string? channel, string? destination)
    {
        var name = (channel ?? string.Empty).Trim().ToLowerInvariant();
        var address = name switch
        {
            OtpChannels.Email => EmailAddress.Normalize(destination),
            OtpChannels.Sms => PhoneNumber.Normalize(destination),
            _ => null
        };

        return address is null ? throw new BusinessException(MessageCodes.AuthOtpDestinationInvalid, 400) : (name, address);
    }

    // Per address: one code per ResendSeconds, MaxPerDestination per DestinationWindowMinutes, MaxPerDestinationPerDay per day, and no new code for LockMinutes
    // once LockAfterFailedCodes codes were used up by wrong tries within DestinationWindowMinutes. A refusal says how long to wait (429 + Retry-After).
    private async Task RequireAllowedAsync(string destination, DateTime now, CancellationToken cancellationToken)
    {
        var otp = _options.Otp;
        var window = TimeSpan.FromMinutes(otp.DestinationWindowMinutes);
        var sentOn = await _otpRepository.GetSentOnAsync(destination, now - (window > Day ? window : Day), cancellationToken);
        var failedOn = await _otpRepository.GetFailedOnAsync(destination, now - window, otp.MaxAttempts, cancellationToken);
        var resend = sentOn.Count == 0 ? TimeSpan.Zero : sentOn.Max() + TimeSpan.FromSeconds(otp.ResendSeconds) - now;
        var locked = failedOn.Count < otp.LockAfterFailedCodes ? TimeSpan.Zero : failedOn.Max() + TimeSpan.FromMinutes(otp.LockMinutes) - now;
        var wait = new[] { resend, locked, WaitFor(sentOn, now, window, otp.MaxPerDestination), WaitFor(sentOn, now, Day, otp.MaxPerDestinationPerDay) }.Max();

        if (wait > TimeSpan.Zero)
            throw new RetryAfterException(MessageCodes.OtpTooManyRequests, (int)Math.Ceiling(wait.TotalSeconds));
    }

    private async Task SendAsync(string channel, string destination, string plainCode, CancellationToken cancellationToken)
    {
        if (channel == OtpChannels.Sms)
        {
            await _smsSender.SendAsync(destination, await _messageService.GetAsync(MessageCodes.AuthOtpSmsText, plainCode, _options.Otp.CodeMinutes), cancellationToken);
            return;
        }

        var subject = await _messageService.GetAsync(MessageCodes.AuthOtpEmailSubject, plainCode);
        var lead = await _messageService.GetAsync(MessageCodes.AuthOtpEmailLead);
        var note = await _messageService.GetAsync(MessageCodes.AuthOtpEmailBody, _options.Otp.CodeMinutes);
        var frame = await EmailHtml.FrameAsync(_messageService, _messageService.CurrentLanguage());
        await _emailSender.SendAsync(MailPurposes.Otp, destination, subject, EmailHtml.Code(frame, lead, plainCode, note), cancellationToken);
    }

    #endregion
}
