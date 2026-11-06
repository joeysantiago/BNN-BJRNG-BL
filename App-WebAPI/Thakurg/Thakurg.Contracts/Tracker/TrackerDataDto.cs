namespace Thakurg.Contracts.Tracker;

// Everything the app shows, loaded at once (GET api/tracker/state); every change answers with it too, so the screens update at once.
public class TrackerDataDto
{
    public List<TrackerTxnDto> Txns { get; set; } = [];

    public List<TrackerAlertDto> Alerts { get; set; } = [];

    public TrackerFilteredDto Filtered { get; set; } = new();

    public TrackerSettingsDto Settings { get; set; } = new();

    public TrackerTrackingDto Tracking { get; set; } = new();
}
