namespace Thakurg.Contracts.Tracker;

// One received message of an SMS backup: its sender header (AD-HDFCBK-S or a bare HDFCBK), its text and when the phone received it.
public class TrackerImportSmsDto
{
    public string? Sender { get; set; }

    public DateTime ReceivedAt { get; set; }

    public string Body { get; set; } = string.Empty;
}
