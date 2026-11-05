namespace Thakurg.Contracts.WhatsApp;

// AccessToken is sent only when typed; empty keeps the saved one.
public class WhatsAppSettingRequestDto
{
    public bool Enabled { get; set; }

    public string? AccessToken { get; set; }

    public string? BusinessAccountId { get; set; }

    public string ApiVersion { get; set; } = string.Empty;

    public string TemplateName { get; set; } = string.Empty;

    public string PhoneNumberId { get; set; } = string.Empty;

    public string TemplateLanguage { get; set; } = string.Empty;
}
