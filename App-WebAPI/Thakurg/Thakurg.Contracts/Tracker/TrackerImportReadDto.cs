namespace Thakurg.Contracts.Tracker;

// The answer of POST api/tracker/sms/import: the counts of the batch, and the Tracker data after it.
public class TrackerImportReadDto
{
    public TrackerDataDto State { get; set; } = new();

    public TrackerImportResultDto Result { get; set; } = new();
}
