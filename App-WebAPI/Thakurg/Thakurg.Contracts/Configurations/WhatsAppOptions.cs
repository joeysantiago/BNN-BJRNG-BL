namespace Thakurg.Contracts.Configurations;

// WhatsApp in appsettings.json: which WhatsApp Business provider sends messages. "None" = not set up yet (sending fails with WhatsAppNotConfigured).
// A provider (Meta Cloud API, Gupshup, Twilio, ...) is added as another IWhatsAppSender and chosen here by name (DependencyInjection.AddWhatsAppSender).
public class WhatsAppOptions
{
    public const string None = "None";

    public const string SectionName = "WhatsApp";

    public string Provider { get; set; } = string.Empty;
}
