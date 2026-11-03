using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;

namespace Thakurg.Infrastructure.Email;

// Sends mail through the SMTP server in Email:Smtp (MailKit). With UseSsl, ImplicitTls uses TLS from the start, otherwise the connection upgrades with STARTTLS.
public class SmtpEmailSender : IEmailSender
{
    private readonly EmailSmtpOptions _smtp;

    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger)
    {
        _smtp = options.Value.Smtp;
        _logger = logger;
    }

    #region Public Methods

    public async Task SendAsync(string to, string subject, string html, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_smtp.Host))
            throw new BusinessException(MessageCodes.EmailNotConfigured, 503);

        try
        {
            var message = new MimeMessage { Subject = subject, Body = new BodyBuilder { HtmlBody = html }.ToMessageBody() };
            message.From.Add(new MailboxAddress(_smtp.FromName, _smtp.FromAddress));
            message.To.Add(MailboxAddress.Parse(to));
            using var client = new SmtpClient();
            await client.ConnectAsync(_smtp.Host, _smtp.Port, Security(), cancellationToken);

            if (_smtp.User.Length > 0)
                await client.AuthenticateAsync(_smtp.User, _smtp.Password, cancellationToken);

            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Sending an e-mail through {Host}:{Port} failed", _smtp.Host, _smtp.Port);
            throw new BusinessException(MessageCodes.EmailSendFailed, 503);
        }
    }

    #endregion

    #region Private Methods

    private SecureSocketOptions Security()
    {
        if (!_smtp.UseSsl)
            return SecureSocketOptions.None;

        return _smtp.ImplicitTls ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
    }

    #endregion
}
