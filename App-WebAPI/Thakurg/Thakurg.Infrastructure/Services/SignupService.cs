using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Settings;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

// A self sign-up is made only after a one-time code proves the address: by e-mail, or to the mobile number by WhatsApp or SMS, as a super admin chose on Settings > General
// (AppSettings Auth.SignupVerification). An address of a disposable mail domain (Auth:BlockedEmailDomains) cannot sign up. A code sent to a mobile number saves that number
// in the new profile. The account itself is made by AuthService: the Standard User role and the AutoGrant apps.
public class SignupService : ISignupService
{
    private readonly AuthOptions _options;

    private readonly IOtpService _otpService;

    private readonly IAuthService _authService;

    private readonly IMessageService _messageService;

    private readonly ISettingsRepository _settingsRepository;

    private readonly IUserProfileRepository _profileRepository;

    public SignupService(IOptions<AuthOptions> options, IOtpService otpService, IAuthService authService, IMessageService messageService, ISettingsRepository settingsRepository, IUserProfileRepository profileRepository)
    {
        _options = options.Value;
        _otpService = otpService;
        _authService = authService;
        _messageService = messageService;
        _settingsRepository = settingsRepository;
        _profileRepository = profileRepository;
    }

    #region Public Methods

    public async Task<SignInDto> RegisterAsync(RegisterRequestDto request, AuthCallerDto caller, CancellationToken cancellationToken)
    {
        var (channel, destination) = await DestinationAsync(request.Email, request.Mobile, cancellationToken);
        await _otpService.ConsumeCodeAsync(channel, destination, OtpApps.Signup, request.Code, cancellationToken);
        var signIn = await _authService.RegisterAsync(request, caller, cancellationToken);

        if (channel != OtpChannels.Email)
            await _profileRepository.AddAsync(new UserProfile { UserId = signIn.Auth.User.Id, Mobile = destination, CreatedBy = signIn.Auth.User.Id }, cancellationToken);

        return signIn;
    }

    public async Task<ServiceResultDto<OtpRequestDto>> RequestCodeAsync(SignupCodeRequestDto request, AuthCallerDto caller, CancellationToken cancellationToken)
    {
        var (channel, destination) = await DestinationAsync(request.Email, request.Mobile, cancellationToken);
        var result = await _otpService.SendCodeAsync(channel, destination, OtpApps.Signup, caller, cancellationToken);

        return new ServiceResultDto<OtpRequestDto> { Data = result, Message = await _messageService.GetAsync(MessageCodes.AuthSignupCodeSent, result.ExpiresInSeconds / 60) };
    }

    #endregion

    #region Private Methods

    // The channel the super admin chose; e-mail when nothing (or something unknown) is saved.
    private async Task<string> ChannelAsync(CancellationToken cancellationToken)
    {
        var saved = (await _settingsRepository.GetSettingValueAsync(SettingCodes.SignupVerification, cancellationToken))?.Trim().ToLowerInvariant();

        return saved is OtpChannels.Sms or OtpChannels.WhatsApp ? saved : OtpChannels.Email;
    }

    // Where the code goes, for a new, allowed e-mail address: that address, or the mobile number (not used by another account) for WhatsApp or SMS.
    private async Task<(string Channel, string Destination)> DestinationAsync(string? email, string? mobile, CancellationToken cancellationToken)
    {
        var address = await _authService.RequireNewAccountAsync(email, cancellationToken);
        var domain = address[(address.IndexOf('@') + 1)..];

        if (_options.BlockedEmailDomains.Any(d => string.Equals(d.Trim(), domain, StringComparison.OrdinalIgnoreCase)))
            throw new BusinessException(MessageCodes.AuthEmailBlocked, 400);

        var channel = await ChannelAsync(cancellationToken);

        if (channel == OtpChannels.Email)
            return (channel, address);

        if (string.IsNullOrWhiteSpace(mobile))
            throw new BusinessException(MessageCodes.AuthSignupMobileRequired, 400);

        var target = _otpService.Normalize(channel, mobile);

        if (await _profileRepository.IsMobileTakenAsync(target.Destination, 0, cancellationToken))
            throw new BusinessException(MessageCodes.ProfileMobileTaken, 409);

        return target;
    }

    #endregion
}
