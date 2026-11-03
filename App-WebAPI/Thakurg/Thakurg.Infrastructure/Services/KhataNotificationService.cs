using System.Globalization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;
using Thakurg.Infrastructure.Email;

namespace Thakurg.Infrastructure.Services;

// Tells a party about an entry added, changed or deleted on their account, by every channel they have on, when the book owner has notifications on.
// The text is in the owner's language (KhataUsers.Language) and names the owner's company (UserProfiles), business or display name.
// Every attempt is written to KhataNotificationLog (errors cut to Khata:Notifications:ErrorLength); "app" waits there as Pending (no push provider yet). A failed e-mail or SMS is logged, never thrown.
public class KhataNotificationService : IKhataNotificationService
{
    private readonly int _errorLength;

    private readonly ISmsSender _smsSender;

    private readonly IEmailSender _emailSender;

    private const string DateFormat = "dd-MM-yyyy";

    private readonly IMessageService _messageService;

    private readonly ILogger<KhataNotificationService> _logger;

    private readonly IKhataNotificationRepository _notificationRepository;

    private static readonly Dictionary<KhataChangeType, string> Templates = new() { [KhataChangeType.Created] = "entry-added", [KhataChangeType.Edited] = "entry-edited", [KhataChangeType.Deleted] = "entry-deleted" };

    private static readonly Dictionary<KhataChangeType, string> ChangeCodes = new() { [KhataChangeType.Created] = MessageCodes.KhataNotifyAdded, [KhataChangeType.Edited] = MessageCodes.KhataNotifyEdited, [KhataChangeType.Deleted] = MessageCodes.KhataNotifyDeleted };

    public KhataNotificationService(IOptions<KhataOptions> options, IKhataNotificationRepository notificationRepository, IEmailSender emailSender, ISmsSender smsSender, IMessageService messageService, ILogger<KhataNotificationService> logger)
    {
        _errorLength = options.Value.Notifications.ErrorLength;
        _notificationRepository = notificationRepository;
        _emailSender = emailSender;
        _smsSender = smsSender;
        _messageService = messageService;
        _logger = logger;
    }

    #region Public Methods

    public async Task SendAsync(KhataNotificationJobDto job, CancellationToken cancellationToken)
    {
        var owner = await _notificationRepository.GetOwnerAsync(job.UserId, cancellationToken);
        var pref = await _notificationRepository.GetPrefAsync(job.ContactId, cancellationToken);

        if (owner is not { NotificationsEnabled: true } || pref is null || !(pref.NotifyPush || pref.NotifySms || pref.NotifyEmail))
            return;

        var contact = await _notificationRepository.GetContactAsync(job.ContactId, cancellationToken);
        var entry = await _notificationRepository.GetTransactionAsync(job.TransactionId, cancellationToken);

        if (contact is null || entry is null)
            return;

        var currency = await _notificationRepository.GetBookCurrencyAsync(entry.BookId, cancellationToken);
        var company = await _notificationRepository.GetCompanyNameAsync(owner.UserId, cancellationToken);
        var sender = company ?? (string.IsNullOrWhiteSpace(owner.BusinessName) ? owner.DisplayName : owner.BusinessName);
        var lines = await LinesAsync(owner.Language, job.ChangeType, entry, contact, currency, sender);
        var template = Templates[job.ChangeType];
        var logs = new List<KhataNotificationLog>();

        if (pref.NotifyPush)
            logs.Add(NewLog(job, KhataNotifyChannel.App, template, KhataNotifyStatus.Pending, null));

        if (pref.NotifySms)
            logs.Add(await TrySendAsync(job, KhataNotifyChannel.Sms, template, contact.Mobile, mobile => _smsSender.SendAsync(mobile, string.Join(" ", lines), cancellationToken)));

        if (pref.NotifyEmail)
        {
            var subject = await _messageService.GetInAsync(owner.Language, MessageCodes.KhataNotifySubject, sender);
            logs.Add(await TrySendAsync(job, KhataNotifyChannel.Email, template, contact.Email, email => _emailSender.SendAsync(email, subject, EmailHtml.Paragraphs(lines, owner.Language == "ar"), cancellationToken)));
        }

        await _notificationRepository.AddLogsAsync(logs, cancellationToken);
    }

    #endregion

    #region Private Methods

    private static string Money(long amountMinor, KhataCurrency? currency)
    {
        return KhataMoney.Format(amountMinor, currency?.Symbol ?? string.Empty, currency?.Decimals ?? 0);
    }

    private KhataNotificationLog NewLog(KhataNotificationJobDto job, KhataNotifyChannel channel, string template, KhataNotifyStatus status, string? error)
    {
        return new KhataNotificationLog { UserId = job.UserId, ContactId = job.ContactId, TransactionId = job.TransactionId, Channel = (byte)channel, Template = template, Status = (byte)status, Error = error is not null && error.Length > _errorLength ? error[.._errorLength] : error };
    }

    // A missing address is logged with its message code; any other failure with the error code or the exception text.
    private async Task<KhataNotificationLog> TrySendAsync(KhataNotificationJobDto job, KhataNotifyChannel channel, string template, string? destination, Func<string, Task> send)
    {
        if (string.IsNullOrEmpty(destination))
            return NewLog(job, channel, template, KhataNotifyStatus.Failed, channel == KhataNotifyChannel.Sms ? MessageCodes.KhataNotifyMobileMissing : MessageCodes.KhataNotifyEmailMissing);

        try
        {
            await send(destination);

            return NewLog(job, channel, template, KhataNotifyStatus.Sent, null);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Sending {Channel} about entry {TransactionId} failed", channel, job.TransactionId);

            return NewLog(job, channel, template, KhataNotifyStatus.Failed, ex is BusinessException business ? business.Code : ex.Message);
        }
    }

    // Two sentences: what changed (amount, given to or received from the party, date) and the party's balance with the owner after it.
    private async Task<List<string>> LinesAsync(string language, KhataChangeType changeType, KhataTransaction entry, KhataContact contact, KhataCurrency? currency, string sender)
    {
        var amount = await _messageService.GetInAsync(language, entry.EntryType == (byte)KhataEntryType.Gave ? MessageCodes.KhataNotifyGave : MessageCodes.KhataNotifyGot, Money(entry.AmountMinor, currency));
        var change = await _messageService.GetInAsync(language, ChangeCodes[changeType], sender, amount, entry.EntryDate.ToString(DateFormat, CultureInfo.InvariantCulture));
        var balanceCode = contact.BalanceMinor switch
        {
            > 0 => MessageCodes.KhataNotifyYouOwe,
            < 0 => MessageCodes.KhataNotifyYouGet,
            _ => MessageCodes.KhataNotifySettled
        };
        var balance = await _messageService.GetInAsync(language, balanceCode, Money(Math.Abs(contact.BalanceMinor), currency));

        return [change, balance];
    }

    #endregion
}
