using System.Text.RegularExpressions;
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

namespace Thakurg.Infrastructure.Services;

// The logged-in user's mobile number, address and company (UserProfiles). Every field is optional and at most Profile:Limits long; the mobile number becomes E.164
// and must not belong to another account. The answer carries the limits, so the UI's maxlength comes from the same settings.
public class UserProfileService : IUserProfileService
{
    private readonly ProfileLimitsOptions _limits;

    private readonly IMessageService _messageService;

    private readonly IUserProfileRepository _profileRepository;

    private static readonly Regex PhonePattern = new(@"^\+?[0-9][0-9 ()\-]*[0-9]$", RegexOptions.Compiled);

    public UserProfileService(IOptions<ProfileOptions> options, IMessageService messageService, IUserProfileRepository profileRepository)
    {
        _limits = options.Value.Limits;
        _messageService = messageService;
        _profileRepository = profileRepository;
    }

    #region Public Methods

    public async Task<ProfileDetailsDto> GetAsync(int userId, CancellationToken cancellationToken)
    {
        return ToDto(await _profileRepository.GetByUserAsync(userId, cancellationToken));
    }

    public async Task<ServiceResultDto<ProfileDetailsDto>> SaveAsync(int userId, ProfileDetailsDto request, CancellationToken cancellationToken)
    {
        var mobile = Phone(request.Mobile, _limits.MobileLength, KhataIdentifier.Mobile);

        if (mobile is not null && await _profileRepository.IsMobileTakenAsync(mobile, userId, cancellationToken))
            throw new BusinessException(MessageCodes.ProfileMobileTaken, 409);

        var profile = await _profileRepository.GetByUserAsync(userId, cancellationToken) ?? new UserProfile { UserId = userId, CreatedBy = userId };
        profile.Mobile = mobile;
        profile.AddressLine1 = Text(request.AddressLine1, _limits.AddressLength);
        profile.AddressLine2 = Text(request.AddressLine2, _limits.AddressLength);
        profile.City = Text(request.City, _limits.CityLength);
        profile.State = Text(request.State, _limits.StateLength);
        profile.PostalCode = Text(request.PostalCode, _limits.PostalCodeLength);
        profile.Country = Text(request.Country, _limits.CountryLength);
        profile.CompanyName = Text(request.CompanyName, _limits.CompanyNameLength);
        profile.CompanyTaxId = Text(request.CompanyTaxId, _limits.CompanyTaxIdLength)?.ToUpperInvariant();
        profile.CompanyEmail = Email(Text(request.CompanyEmail, _limits.CompanyEmailLength));
        profile.CompanyPhone = Phone(request.CompanyPhone, _limits.CompanyPhoneLength, phone => PhonePattern.IsMatch(phone) ? phone : null);
        profile.CompanyAddress = Text(request.CompanyAddress, _limits.CompanyAddressLength);

        if (profile.Id == 0)
        {
            await _profileRepository.AddAsync(profile, cancellationToken);
        }
        else
        {
            profile.ModifiedBy = userId;
            profile.ModifiedOn = DateTime.UtcNow;
            await _profileRepository.SaveChangesAsync(cancellationToken);
        }

        return new ServiceResultDto<ProfileDetailsDto> { Data = ToDto(profile), Message = await _messageService.GetAsync(MessageCodes.ProfileDetailsSaved) };
    }

    #endregion

    #region Private Methods

    private static BusinessException Invalid()
    {
        return new BusinessException(MessageCodes.ProfileDetailsInvalid, 400);
    }

    private static string? Email(string? value)
    {
        if (value is null)
            return null;

        return EmailAddress.Normalize(value) ?? throw Invalid();
    }

    private ProfileDetailsDto ToDto(UserProfile? profile)
    {
        var limits = new ProfileLimitsDto { AddressLength = _limits.AddressLength, CityLength = _limits.CityLength, StateLength = _limits.StateLength, PostalCodeLength = _limits.PostalCodeLength, CountryLength = _limits.CountryLength, MobileLength = _limits.MobileLength, CompanyNameLength = _limits.CompanyNameLength, CompanyTaxIdLength = _limits.CompanyTaxIdLength, CompanyEmailLength = _limits.CompanyEmailLength, CompanyPhoneLength = _limits.CompanyPhoneLength, CompanyAddressLength = _limits.CompanyAddressLength };

        return new ProfileDetailsDto { Mobile = profile?.Mobile, AddressLine1 = profile?.AddressLine1, AddressLine2 = profile?.AddressLine2, City = profile?.City, State = profile?.State, PostalCode = profile?.PostalCode, Country = profile?.Country, CompanyName = profile?.CompanyName, CompanyTaxId = profile?.CompanyTaxId, CompanyEmail = profile?.CompanyEmail, CompanyPhone = profile?.CompanyPhone, CompanyAddress = profile?.CompanyAddress, Limits = limits };
    }

    private static string? Text(string? value, int maxLength)
    {
        var text = value?.Trim();

        if (text?.Length > maxLength)
            throw Invalid();

        return string.IsNullOrEmpty(text) ? null : text;
    }

    private static string? Phone(string? value, int maxLength, Func<string, string?> normalize)
    {
        var text = Text(value, maxLength);

        return text is null ? null : normalize(text) ?? throw Invalid();
    }

    #endregion
}
