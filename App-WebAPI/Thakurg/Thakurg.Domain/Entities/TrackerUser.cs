using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// The SnapTracker profile of one common account (Users): approval, alerts, SMS reading on the phone and the counts of ignored messages.
public class TrackerUser : BaseEntity
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int FilteredOtp { get; set; }

    public bool PushEnabled { get; set; }

    public int FilteredOther { get; set; }

    public int FilteredPromo { get; set; }

    public int FilteredFailed { get; set; }

    public int AutoApprovePercent { get; set; }

    public DateTime? TrackingSince { get; set; }

    public string AlertTypes { get; set; } = string.Empty;

    public string ApprovalMode { get; set; } = string.Empty;

    public string TrackingState { get; set; } = string.Empty;
}
