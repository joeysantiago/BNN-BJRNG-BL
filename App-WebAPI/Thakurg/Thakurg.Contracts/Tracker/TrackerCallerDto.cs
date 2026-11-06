namespace Thakurg.Contracts.Tracker;

// Who calls a SnapTracker endpoint: the TrackerUsers row and the common account.
public class TrackerCallerDto
{
    public int UserId { get; set; }

    public int AccountUserId { get; set; }
}
