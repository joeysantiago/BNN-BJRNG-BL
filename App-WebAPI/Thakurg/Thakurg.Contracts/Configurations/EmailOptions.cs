namespace Thakurg.Contracts.Configurations;

// Email in appsettings.json: the SMTP server mail is sent through.
public class EmailOptions
{
    public const string SectionName = "Email";

    public EmailSmtpOptions Smtp { get; set; } = new();
}
