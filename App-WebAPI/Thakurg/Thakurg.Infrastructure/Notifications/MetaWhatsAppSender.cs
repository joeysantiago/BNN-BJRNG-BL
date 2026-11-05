using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;

namespace Thakurg.Infrastructure.Notifications;

// WhatsApp:Provider = Meta: sends through the Meta WhatsApp Cloud API (POST {version}/{phone number id}/messages). A message a business starts must be an
// approved template, so the text goes into the one body variable ({{1}}) of the template saved on Settings > General. The account, token and template
// come from the database (WhatsAppSettings); with none saved or switched off, sending fails with WhatsAppNotConfigured.
public class MetaWhatsAppSender : IWhatsAppSender
{
    private readonly HttpClient _http;

    private const int TextLength = 1024;

    private readonly ILogger<MetaWhatsAppSender> _logger;

    private readonly IWhatsAppSecretProtector _protector;

    private readonly IWhatsAppSettingRepository _settingRepository;

    public MetaWhatsAppSender(HttpClient http, IWhatsAppSettingRepository settingRepository, IWhatsAppSecretProtector protector, ILogger<MetaWhatsAppSender> logger)
    {
        _http = http;
        _settingRepository = settingRepository;
        _protector = protector;
        _logger = logger;
    }

    #region Public Methods

    public async Task SendAsync(string to, string text, CancellationToken cancellationToken)
    {
        var setting = await _settingRepository.ReadAsync(cancellationToken);

        if (setting is not { Enabled: true, AccessTokenProtected: not null })
            throw new BusinessException(MessageCodes.WhatsAppNotConfigured, 503);

        var body = new
        {
            messaging_product = "whatsapp",
            to = to.TrimStart('+'),
            type = "template",
            template = new { name = setting.TemplateName, language = new { code = setting.TemplateLanguage }, components = new[] { new { type = "body", parameters = new[] { new { type = "text", text = text.Length > TextLength ? text[..TextLength] : text } } } } }
        };
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{setting.ApiVersion}/{setting.PhoneNumberId}/messages") { Content = JsonContent.Create(body) };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _protector.Unprotect(setting.AccessTokenProtected));
        using var response = await _http.SendAsync(request, cancellationToken);

        if (response.IsSuccessStatusCode)
            return;

        _logger.LogWarning("WhatsApp send failed with {Status}: {Body}", (int)response.StatusCode, await response.Content.ReadAsStringAsync(cancellationToken));
        throw new BusinessException(MessageCodes.WhatsAppSendFailed, 502);
    }

    #endregion
}
