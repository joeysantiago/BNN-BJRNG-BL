namespace Thakurg.Contracts.Tracker;

// One batch of an SMS backup (at most Tracker:Limits:MaxImportBatch messages); the app sends a backup in batches, oldest first.
public class TrackerImportRequestDto
{
    public List<TrackerImportSmsDto> Messages { get; set; } = [];
}
