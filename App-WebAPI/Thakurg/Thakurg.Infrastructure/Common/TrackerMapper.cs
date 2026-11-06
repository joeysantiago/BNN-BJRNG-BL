using System.Text.Json;
using Thakurg.Application.Services;
using Thakurg.Contracts.Tracker;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Common;

// SnapTracker rows as the app sees them. Amounts go from paise to rupees; every date is UTC (the database keeps UTC without the kind), so the app reads it right.
public static class TrackerMapper
{
    #region Public Methods

    public static DateTime Utc(DateTime value)
    {
        return DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    public static TrackerAlertDto ToDto(TrackerAlert alert)
    {
        return new TrackerAlertDto { Id = alert.Id, At = Utc(alert.CreatedOn), Read = alert.IsRead, Type = alert.Type, TxnId = alert.TransactionId, Args = JsonSerializer.Deserialize<Dictionary<string, object>>(alert.Args) ?? [] };
    }

    // The SMS text is decrypted only here, for the user who owns it; a text that can no longer be read (lost keys) shows as deleted.
    public static TrackerTxnDto ToDto(TrackerTransaction t, ITrackerSecretProtector protector)
    {
        return new TrackerTxnDto
        {
            Id = t.Id,
            At = Utc(t.OccurredOn),
            CreatedAt = Utc(t.CreatedOn),
            Note = t.Note,
            Amount = t.AmountMinor / 100m,
            Edited = t.IsEdited,
            Type = t.Type,
            TypeGuessed = t.TypeGuessed,
            Category = t.CategoryCode,
            Kind = t.Kind,
            Method = t.Method,
            Ref = t.Reference,
            Account = t.AccountLast4,
            Merchant = t.Merchant,
            Confidence = t.Confidence,
            Source = t.Source,
            Status = t.Status,
            DupOf = t.DuplicateOfId,
            DupWhy = t.DuplicateReason,
            Sms = t.SmsText is { } sms ? Sms(sms, protector) : null,
        };
    }

    public static TrackerSettingsDto ToSettings(TrackerUser user, IEnumerable<string> alertTypes)
    {
        var on = user.AlertTypes.Split(',', StringSplitOptions.RemoveEmptyEntries);

        return new TrackerSettingsDto { Push = user.PushEnabled, Threshold = user.AutoApprovePercent, Approval = user.ApprovalMode, Alerts = alertTypes.ToDictionary(t => t, t => on.Contains(t)) };
    }

    #endregion

    #region Private Methods

    private static TrackerSmsDto? Sms(TrackerSmsText sms, ITrackerSecretProtector protector)
    {
        try
        {
            return new TrackerSmsDto { Body = protector.Unprotect(sms.BodyProtected), Marks = JsonSerializer.Deserialize<List<string>>(sms.Marks) ?? [], Sender = sms.SenderHeader, SenderName = sms.SenderName, ReceivedAt = Utc(sms.ReceivedOn) };
        }
        catch (System.Security.Cryptography.CryptographicException)
        {
            return null;
        }
    }

    #endregion
}
