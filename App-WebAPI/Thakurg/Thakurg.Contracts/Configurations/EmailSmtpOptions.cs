namespace Thakurg.Contracts.Configurations;

// Email:Smtp. An empty Host means mail is not set up: sending then fails with EmailNotConfigured. Keep User / Password in user-secrets or the host's settings, not in the file.
public class EmailSmtpOptions
{
    public int Port { get; set; }

    public bool UseSsl { get; set; }

    public string Host { get; set; } = string.Empty;

    public string User { get; set; } = string.Empty;

    public string FromName { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string FromAddress { get; set; } = string.Empty;
}
