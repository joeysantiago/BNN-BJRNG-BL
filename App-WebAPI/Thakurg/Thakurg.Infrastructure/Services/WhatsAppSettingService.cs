using System.Text.RegularExpressions;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.WhatsApp;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// Settings > General > WhatsApp: the Meta WhatsApp Cloud API account of the site (super admins only). The access token is stored encrypted and never returned.
public partial class WhatsAppSettingService : IWhatsAppSettingService
{
    private const int TokenLength = 1000;

    private readonly IWhatsAppSender _sender;

    private readonly IMessageService _messageService;

    private readonly IWhatsAppSecretProtector _protector;

    private readonly IWhatsAppSettingRepository _settingRepository;

    public WhatsAppSettingService(IWhatsAppSettingRepository settingRepository, IWhatsAppSecretProtector protector, IWhatsAppSender sender, IMessageService messageService)
    {
        _settingRepository = settingRepository;
        _protector = protector;
        _sender = sender;
        _messageService = messageService;
    }

    #region Public Methods

    public async Task<WhatsAppSettingDto> GetAsync(CancellationToken cancellationToken)
    {
        return ToDto(await _settingRepository.ReadAsync(cancellationToken));
    }

    // Sends the test text to the given number through the saved account.
    public async Task<string> TestAsync(WhatsAppTestRequestDto request, CancellationToken cancellationToken)
    {
        var to = PhoneNumber.Normalize(request.To) ?? throw new BusinessException(MessageCodes.WhatsAppNumberInvalid, 400);
        await _sender.SendAsync(to, await _messageService.GetAsync(MessageCodes.WhatsAppTestText), cancellationToken);

        return await _messageService.GetAsync(MessageCodes.WhatsAppTestSent, to);
    }

    public async Task<ServiceResultDto<WhatsAppSettingDto>> SaveAsync(int userId, WhatsAppSettingRequestDto request, CancellationToken cancellationToken)
    {
        var setting = await _settingRepository.GetAsync(cancellationToken);
        var token = request.AccessToken?.Trim();
        var hasToken = !string.IsNullOrEmpty(token) || setting?.AccessTokenProtected is not null;
        var valid = DigitsPattern().IsMatch(request.PhoneNumberId.Trim()) && VersionPattern().IsMatch(request.ApiVersion.Trim()) && TemplatePattern().IsMatch(request.TemplateName.Trim()) && LanguagePattern().IsMatch(request.TemplateLanguage.Trim()) && (string.IsNullOrWhiteSpace(request.BusinessAccountId) || DigitsPattern().IsMatch(request.BusinessAccountId.Trim())) && (token?.Length ?? 0) <= TokenLength;

        if (!valid || (request.Enabled && !hasToken))
            throw new BusinessException(MessageCodes.WhatsAppInvalid, 400);

        var row = setting ?? new WhatsAppSetting { CreatedBy = userId };
        row.Enabled = request.Enabled;
        row.PhoneNumberId = request.PhoneNumberId.Trim();
        row.BusinessAccountId = string.IsNullOrWhiteSpace(request.BusinessAccountId) ? null : request.BusinessAccountId.Trim();
        row.ApiVersion = request.ApiVersion.Trim();
        row.TemplateName = request.TemplateName.Trim();
        row.TemplateLanguage = request.TemplateLanguage.Trim();

        if (!string.IsNullOrEmpty(token))
            row.AccessTokenProtected = _protector.Protect(token);

        if (setting is null)
            await _settingRepository.AddAsync(row, cancellationToken);
        else
        {
            row.ModifiedBy = userId;
            row.ModifiedOn = DateTime.UtcNow;
            await _settingRepository.SaveChangesAsync(cancellationToken);
        }

        return new ServiceResultDto<WhatsAppSettingDto> { Data = ToDto(row), Message = await _messageService.GetAsync(MessageCodes.WhatsAppSaved) };
    }

    #endregion

    #region Private Methods

    [GeneratedRegex("^[0-9]{5,40}$")]
    private static partial Regex DigitsPattern();

    [GeneratedRegex("^v[0-9]{1,3}\\.[0-9]{1,3}$")]
    private static partial Regex VersionPattern();

    [GeneratedRegex("^[a-z0-9_]{1,512}$")]
    private static partial Regex TemplatePattern();

    [GeneratedRegex("^[a-z]{2,3}(_[A-Z]{2})?$")]
    private static partial Regex LanguagePattern();

    private static WhatsAppSettingDto ToDto(WhatsAppSetting? row)
    {
        return row is null ? new WhatsAppSettingDto() : new WhatsAppSettingDto { Enabled = row.Enabled, PhoneNumberId = row.PhoneNumberId, BusinessAccountId = row.BusinessAccountId, ApiVersion = row.ApiVersion, TemplateName = row.TemplateName, TemplateLanguage = row.TemplateLanguage, HasAccessToken = row.AccessTokenProtected is not null };
    }

    #endregion
}
