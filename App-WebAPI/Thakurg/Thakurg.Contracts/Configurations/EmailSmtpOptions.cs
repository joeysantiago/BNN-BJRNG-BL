namespace Thakurg.Contracts.Configurations;

// Email:Smtp: the last fallback server, used only when no mail profile is saved and switched on (Settings > General and Mail). It has no login:
// the user name and password of a mail server are entered in Settings > General and kept encrypted in the database (MailSettings), never in a file.
// UseSsl with ImplicitTls = TLS from the start (port 465), without it = STARTTLS (port 587). An empty Host means mail is not set up (EmailNotConfigured).
public class EmailSmtpOptions
{
    public int Port { get; set; }

    public bool UseSsl { get; set; }

    public bool ImplicitTls { get; set; }

    public string Host { get; set; } = string.Empty;

    public string FromName { get; set; } = string.Empty;

    public string FromAddress { get; set; } = string.Empty;
}
