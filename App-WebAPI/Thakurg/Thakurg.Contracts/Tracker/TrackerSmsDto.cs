namespace Thakurg.Contracts.Tracker;

// The original SMS of a transaction; Marks are the parts the reader used (amount, merchant, account, reference).
public class TrackerSmsDto
{
    public DateTime ReceivedAt { get; set; }

    public List<string> Marks { get; set; } = [];

    public string Body { get; set; } = string.Empty;

    public string Sender { get; set; } = string.Empty;

    public string SenderName { get; set; } = string.Empty;
}
