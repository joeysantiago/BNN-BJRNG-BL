namespace Thakurg.Contracts.Tracker;

// The SnapTracker settings of a user (Settings > General > SnapTracker). Alerts maps each alert type to on or off.
public class TrackerSettingsDto
{
    public bool Push { get; set; }

    public int Threshold { get; set; }

    public string Approval { get; set; } = string.Empty;

    public Dictionary<string, bool> Alerts { get; set; } = [];
}
