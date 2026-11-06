namespace Thakurg.Contracts.Tracker;

// What reading one SMS gave: created, duplicate or skipped (with its reason, tracker.out.<reason>), and every step.
public class TrackerSmsResultDto
{
    public string? Reason { get; set; }

    public TrackerTxnDto? Txn { get; set; }

    public string Outcome { get; set; } = string.Empty;

    public List<TrackerStepDto> Steps { get; set; } = [];
}
