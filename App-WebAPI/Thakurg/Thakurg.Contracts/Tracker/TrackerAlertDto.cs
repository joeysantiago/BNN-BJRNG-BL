namespace Thakurg.Contracts.Tracker;

// An alert of the bell list; its title and line are built in the UI from the type (tracker.alert.<type>) and Args.
public class TrackerAlertDto
{
    public int Id { get; set; }

    public bool Read { get; set; }

    public int? TxnId { get; set; }

    public DateTime At { get; set; }

    public string Type { get; set; } = string.Empty;

    public Dictionary<string, object> Args { get; set; } = [];
}
