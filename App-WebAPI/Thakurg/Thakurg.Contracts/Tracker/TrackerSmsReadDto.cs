namespace Thakurg.Contracts.Tracker;

// The answer of POST api/tracker/sms: what happened to the message, and the SnapTracker data after it.
public class TrackerSmsReadDto
{
    public TrackerDataDto State { get; set; } = new();

    public TrackerSmsResultDto Result { get; set; } = new();
}
