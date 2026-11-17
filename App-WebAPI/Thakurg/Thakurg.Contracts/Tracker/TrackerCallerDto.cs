namespace Thakurg.Contracts.Tracker;

// Who calls a Tracker endpoint: the TrackerUsers row and the common account.
public class TrackerCallerDto
{
    public int UserId { get; set; }

    public int AccountUserId { get; set; }
}
