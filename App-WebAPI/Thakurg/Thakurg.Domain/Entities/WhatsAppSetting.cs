using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// The WhatsApp Business account of the site (Meta Cloud API). One row; the access token is stored encrypted.
public class WhatsAppSetting : BaseEntity
{
    public int Id { get; set; }

    public bool Enabled { get; set; }

    public string? BusinessAccountId { get; set; }

    public string? AccessTokenProtected { get; set; }

    public string ApiVersion { get; set; } = string.Empty;

    public string TemplateName { get; set; } = string.Empty;

    public string PhoneNumberId { get; set; } = string.Empty;

    public string TemplateLanguage { get; set; } = string.Empty;
}
