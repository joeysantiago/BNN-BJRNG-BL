namespace Thakurg.Contracts.Tracker;

// A pasted or shared SMS: its text and, when known, its sender header (AD-HDFCBK-S).
public class TrackerSmsRequestDto
{
    public string? Sender { get; set; }

    public string Body { get; set; } = string.Empty;
}
