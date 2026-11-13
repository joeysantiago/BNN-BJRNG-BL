namespace Thakurg.Contracts.Tracker;

// The user's own name for a bank account, card or loan ("ICICI salary", "Car loan"); empty clears it.
public class TrackerAccountRequestDto
{
    public string? Label { get; set; }
}
