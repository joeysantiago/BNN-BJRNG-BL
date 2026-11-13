using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// The SnapTracker profile of one common account (Users): approval, alerts, SMS reading on the phone, the counts of ignored messages, and who the user is
// in an SMS (OwnNames, OwnMobiles: comma-separated) so money between the user's own accounts is a self transfer.
public class TrackerUser : BaseEntity
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int FilteredOtp { get; set; }

    public bool PushEnabled { get; set; }

    public int FilteredOther { get; set; }

    public int FilteredPromo { get; set; }

    public int FilteredFailed { get; set; }

    public int FilteredNotice { get; set; }

    public int FilteredBalance { get; set; }

    public int AutoApprovePercent { get; set; }

    public DateTime? TrackingSince { get; set; }

    public string AlertTypes { get; set; } = string.Empty;

    public string ApprovalMode { get; set; } = string.Empty;

    public string OwnNames { get; set; } = string.Empty;

    public string OwnMobiles { get; set; } = string.Empty;

    public string TrackingState { get; set; } = string.Empty;
}
