namespace Thakurg.Contracts.Tracker;

// A transaction typed in by hand, or the edited fields of one. Amount is in rupees.
public class TrackerTxnRequestDto
{
    public DateTime At { get; set; }

    public string? Note { get; set; }

    public decimal Amount { get; set; }

    public string? Merchant { get; set; }

    public string Type { get; set; } = string.Empty;

    public string Method { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;
}
