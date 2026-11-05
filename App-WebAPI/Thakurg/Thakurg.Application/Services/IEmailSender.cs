namespace Thakurg.Application.Services;

// Sends one HTML e-mail for a purpose (MailPurposes), through that purpose's mail server. Fails with BusinessException EmailNotConfigured (503) when no SMTP server is set, EmailSendFailed (503) when the server refuses it.
public interface IEmailSender
{
    Task SendAsync(string purpose, string to, string subject, string html, CancellationToken cancellationToken);
}
