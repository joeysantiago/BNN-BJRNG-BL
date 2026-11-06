namespace Thakurg.Contracts.Configurations;

// The settings a new SnapTracker profile starts with (Tracker:NewUser).
public class TrackerNewUserOptions
{
    public bool PushEnabled { get; set; }

    public int AutoApprovePercent { get; set; }

    public List<string> AlertTypes { get; set; } = [];

    public string ApprovalMode { get; set; } = string.Empty;
}
