namespace Thakurg.Contracts.Mail;

// A mail server profile as Settings > Mail shows it. The password is never returned: HasPassword says one is saved.
public class MailSettingDto
{
    public int Port { get; set; }

    public bool Enabled { get; set; }

    public bool HasPassword { get; set; }

    public string Host { get; set; } = string.Empty;

    public string Purpose { get; set; } = string.Empty;

    public string FromName { get; set; } = string.Empty;

    public string Security { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string FromAddress { get; set; } = string.Empty;
}
