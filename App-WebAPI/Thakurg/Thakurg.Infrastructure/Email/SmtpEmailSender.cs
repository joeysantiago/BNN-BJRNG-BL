using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Mail;
using Thakurg.Contracts.Messages;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Email;

// Sends mail with MailKit through the server for the mail's purpose (MailPurposes): the profile a super admin saved in Settings > Mail when it is
// switched on, otherwise the site's default server (Settings > General), otherwise the server in appsettings Email:Smtp (no login).
// With UseSsl, ImplicitTls uses TLS from the start, otherwise the connection upgrades with STARTTLS.
public class SmtpEmailSender : IEmailSender
{
    private readonly EmailSmtpOptions _smtp;

    private readonly IMailSecretProtector _protector;

    private readonly ILogger<SmtpEmailSender> _logger;

    private readonly IMailSettingRepository _mailRepository;

    public SmtpEmailSender(IOptions<EmailOptions> options, IMailSettingRepository mailRepository, IMailSecretProtector protector, ILogger<SmtpEmailSender> logger)
    {
        _smtp = options.Value.Smtp;
        _mailRepository = mailRepository;
        _protector = protector;
        _logger = logger;
    }

    #region Public Methods

    public async Task SendAsync(string purpose, string to, string subject, string html, CancellationToken cancellationToken)
    {
        var server = await ServerAsync(purpose, cancellationToken);

        if (string.IsNullOrWhiteSpace(server.Host))
            throw new BusinessException(MessageCodes.EmailNotConfigured, 503);

        try
        {
            var message = new MimeMessage { Subject = subject, Body = new BodyBuilder { HtmlBody = html }.ToMessageBody() };
            message.From.Add(new MailboxAddress(server.FromName, server.FromAddress));
            message.To.Add(MailboxAddress.Parse(to));
            using var client = new SmtpClient();
            await client.ConnectAsync(server.Host, server.Port, Security(server), cancellationToken);

            if (server.User.Length > 0)
                await client.AuthenticateAsync(server.User, server.Password, cancellationToken);

            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Sending a {Purpose} e-mail through {Host}:{Port} failed", purpose, server.Host, server.Port);
            throw new BusinessException(MessageCodes.EmailSendFailed, 503);
        }
    }

    #endregion

    #region Private Methods

    private static bool IsUsable(MailSetting? setting)
    {
        return setting is { Enabled: true } && !string.IsNullOrWhiteSpace(setting.Host);
    }

    private static SecureSocketOptions Security(MailServerDto server)
    {
        if (!server.UseSsl)
            return SecureSocketOptions.None;

        return server.ImplicitTls ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
    }

    // The saved profile of this purpose, else the default profile, when it is on and has a host; the password is decrypted only here, for this one connection.
    private async Task<MailServerDto> ServerAsync(string purpose, CancellationToken cancellationToken)
    {
        var setting = await _mailRepository.GetAsync(purpose, cancellationToken);

        if (!IsUsable(setting) && purpose != MailPurposes.Default)
            setting = await _mailRepository.GetAsync(MailPurposes.Default, cancellationToken);

        if (setting is null || !IsUsable(setting))
            return new MailServerDto { Host = _smtp.Host, Port = _smtp.Port, UseSsl = _smtp.UseSsl, ImplicitTls = _smtp.ImplicitTls, FromName = _smtp.FromName, FromAddress = _smtp.FromAddress };

        return new MailServerDto
        {
            Host = setting.Host!,
            Port = setting.Port,
            UseSsl = setting.Security != MailSecurityModes.None,
            ImplicitTls = setting.Security == MailSecurityModes.Ssl,
            User = setting.UserName ?? string.Empty,
            Password = setting.PasswordProtected is null ? string.Empty : _protector.Unprotect(setting.PasswordProtected),
            FromName = setting.FromName ?? _smtp.FromName,
            FromAddress = setting.FromAddress ?? _smtp.FromAddress
        };
    }

    #endregion
}
