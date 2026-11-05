namespace Thakurg.Contracts.WhatsApp;

// The WhatsApp Business account as Settings > General shows it. The access token is never sent back: HasAccessToken says one is saved.
public class WhatsAppSettingDto
{
    public bool Enabled { get; set; }

    public bool HasAccessToken { get; set; }

    public string? BusinessAccountId { get; set; }

    public string ApiVersion { get; set; } = string.Empty;

    public string TemplateName { get; set; } = string.Empty;

    public string PhoneNumberId { get; set; } = string.Empty;

    public string TemplateLanguage { get; set; } = string.Empty;
}
