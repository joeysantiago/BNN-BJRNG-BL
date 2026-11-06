using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// A SnapTracker transaction (TrackerTransactions). AmountMinor is in paise; SmsText is the original SMS, deleted separately on request.
public class TrackerTransaction : BaseEntity
{
    public int Id { get; set; }

    public string? Kind { get; set; }

    public bool IsEdited { get; set; }

    public int Confidence { get; set; }

    public bool TypeGuessed { get; set; }

    public long AmountMinor { get; set; }

    public string? Merchant { get; set; }

    public int TrackerUserId { get; set; }

    public string? Reference { get; set; }

    public int? DuplicateOfId { get; set; }

    public DateTime OccurredOn { get; set; }

    public string? AccountLast4 { get; set; }

    public TrackerSmsText? SmsText { get; set; }

    public string? DuplicateReason { get; set; }

    public string Note { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public string Method { get; set; } = string.Empty;

    public string Source { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string CategoryCode { get; set; } = string.Empty;

    public string CurrencyCode { get; set; } = string.Empty;
}
