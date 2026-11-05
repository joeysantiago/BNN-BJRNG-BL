namespace Thakurg.Contracts.Mail;

// The mail server one e-mail is sent through: a saved profile (MailSettings, password decrypted for this connection only) or the server in
// appsettings Email:Smtp, which has no login. UseSsl with ImplicitTls = TLS from the start (port 465), without it = STARTTLS (port 587).
public class MailServerDto
{
    public int Port { get; set; }

    public bool UseSsl { get; set; }

    public bool ImplicitTls { get; set; }

    public string Host { get; set; } = string.Empty;

    public string User { get; set; } = string.Empty;

    public string FromName { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string FromAddress { get; set; } = string.Empty;
}
