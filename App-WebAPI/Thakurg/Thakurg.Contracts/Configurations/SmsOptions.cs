namespace Thakurg.Contracts.Configurations;

// Sms in appsettings.json: which text-message provider sends SMS. "None" = not set up yet (sending fails with SmsNotConfigured).
// A provider (MSG91, Twilio, ...) is added as another ISmsSender and chosen here by name (DependencyInjection.AddSmsSender).
public class SmsOptions
{
    public const string None = "None";

    public const string SectionName = "Sms";

    public string Provider { get; set; } = string.Empty;
}
