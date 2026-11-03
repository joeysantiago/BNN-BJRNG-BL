namespace Thakurg.Application.Services;

// Sends one HTML e-mail. Fails with BusinessException EmailNotConfigured (503) when no SMTP server is set, EmailSendFailed (503) when the server refuses it.
public interface IEmailSender
{
    Task SendAsync(string to, string subject, string html, CancellationToken cancellationToken);
}
