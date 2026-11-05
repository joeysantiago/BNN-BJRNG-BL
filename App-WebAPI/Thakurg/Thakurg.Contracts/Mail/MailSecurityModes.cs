namespace Thakurg.Contracts.Mail;

// How the connection to the mail server is secured: StartTls = upgrade after connecting (port 587), Ssl = TLS from the start (port 465), None = plain.
public static class MailSecurityModes
{
    public const string Ssl = "ssl";

    public const string None = "none";

    public const string StartTls = "starttls";

    public static readonly string[] All = [StartTls, Ssl, None];
}
