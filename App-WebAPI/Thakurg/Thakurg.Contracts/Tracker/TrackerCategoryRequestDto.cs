namespace Thakurg.Contracts.Tracker;

// A new category for a transaction; Remember also files every later transaction of its merchant there.
public class TrackerCategoryRequestDto
{
    public bool Remember { get; set; }

    public string Category { get; set; } = string.Empty;
}
