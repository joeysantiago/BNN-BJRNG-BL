using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class KhataUser : BaseEntity
{
    public int Id { get; set; }

    public string? Email { get; set; }

    public string? UpiId { get; set; }

    public string? Mobile { get; set; }

    public int? LastBookId { get; set; }

    public string? PinHash { get; set; }

    public byte UpiQrSource { get; set; }

    public bool NotifyMePush { get; set; }

    public DateTime? PinSetOn { get; set; }

    public bool NotifyMeEmail { get; set; }

    public int PinFailedCount { get; set; }

    public byte StorageProvider { get; set; }

    public string? BusinessName { get; set; }

    public string? UpiPayeeName { get; set; }

    public bool DailySummaryPush { get; set; }

    public string? GoogleSubject { get; set; }

    public bool DailySummaryEmail { get; set; }

    public int? UpiQrStoredFileId { get; set; }

    public DateTime? PinLockedUntil { get; set; }

    public bool DailySummaryEnabled { get; set; }

    public DateTime? EmailVerifiedOn { get; set; }

    public TimeOnly DailySummaryTime { get; set; }

    public bool? DeletionDeleteFiles { get; set; }

    public DateTime? MobileVerifiedOn { get; set; }

    public DateTime? StorageSkippedOn { get; set; }

    public DateOnly? LastDailySummaryOn { get; set; }

    public DateTime? DeletionScheduledOn { get; set; }

    public string Language { get; set; } = string.Empty;

    public string TimeZone { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;
}
