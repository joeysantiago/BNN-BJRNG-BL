using System.Globalization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Mail;
using Thakurg.Contracts.Messages;
using Thakurg.Infrastructure.Email;

namespace Thakurg.Infrastructure.Services;

// E-mails a user about a change to their own account, in their language (Users.Language), through the account mail server (MailPurposes.Otp).
// The change is already saved when the mail goes, so a mail that cannot be sent is logged, never thrown.
public class AccountMailService : IAccountMailService
{
    private readonly string _phoneDomain;

    private readonly IEmailSender _emailSender;

    private const string DateFormat = "dd-MM-yyyy";

    private readonly IMessageService _messageService;

    private readonly ILogger<AccountMailService> _logger;

    public AccountMailService(IOptions<AuthOptions> options, IEmailSender emailSender, IMessageService messageService, ILogger<AccountMailService> logger)
    {
        _phoneDomain = "@" + options.Value.Otp.PhoneEmailDomain;
        _emailSender = emailSender;
        _messageService = messageService;
        _logger = logger;
    }

    #region Public Methods

    // A mobile-only account has a placeholder e-mail on Auth:Otp:PhoneEmailDomain, so it gets no mail.
    public async Task SendAccountDeletedAsync(string email, string displayName, string language, DateTime deletedOn, CancellationToken cancellationToken)
    {
        if (email.EndsWith(_phoneDomain, StringComparison.OrdinalIgnoreCase))
            return;

        try
        {
            var subject = await _messageService.GetInAsync(language, MessageCodes.AuthDeletedEmailSubject);
            var hello = await _messageService.GetInAsync(language, MessageCodes.AuthDeletedEmailHello, displayName);
            var body = await _messageService.GetInAsync(language, MessageCodes.AuthDeletedEmailBody, email, deletedOn.ToString(DateFormat, CultureInfo.InvariantCulture));
            var warning = await _messageService.GetInAsync(language, MessageCodes.AuthDeletedEmailWarning);
            var frame = await EmailHtml.FrameAsync(_messageService, language);
            await _emailSender.SendAsync(MailPurposes.Otp, email, subject, EmailHtml.Notice(frame, null, [hello, body], warning, EmailTone.Warning), cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "The account-deleted e-mail could not be sent");
        }
    }

    #endregion
}
