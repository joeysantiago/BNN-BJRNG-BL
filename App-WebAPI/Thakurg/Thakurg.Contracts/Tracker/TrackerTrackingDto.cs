namespace Thakurg.Contracts.Tracker;

// SMS reading on the phone (permission, enabled or paused), and since when it is on.
public class TrackerTrackingDto
{
    public DateTime? Since { get; set; }

    public string State { get; set; } = string.Empty;
}
