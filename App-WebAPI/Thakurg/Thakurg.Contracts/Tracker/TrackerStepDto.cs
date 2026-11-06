namespace Thakurg.Contracts.Tracker;

// One step of reading an SMS: where it ran (phone or server), its key (tracker.step.<key>), whether it passed and the values of its detail line.
public class TrackerStepDto
{
    public bool Ok { get; set; }

    public string Key { get; set; } = string.Empty;

    public string Where { get; set; } = string.Empty;

    public Dictionary<string, object> Args { get; set; } = [];
}
