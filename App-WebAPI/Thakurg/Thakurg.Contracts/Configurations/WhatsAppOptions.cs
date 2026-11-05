namespace Thakurg.Contracts.Configurations;

// WhatsApp in appsettings.json: which WhatsApp Business provider sends messages. "None" = not set up (sending fails with WhatsAppNotConfigured);
// "Meta" = the Meta WhatsApp Cloud API at BaseUrl. The account itself (phone number id, access token, template) is kept in the database (WhatsAppSettings).
public class WhatsAppOptions
{
    public const string Meta = "Meta";

    public const string None = "None";

    public int TimeoutSeconds { get; set; }

    public const string SectionName = "WhatsApp";

    public string BaseUrl { get; set; } = string.Empty;

    public string Provider { get; set; } = string.Empty;
}
