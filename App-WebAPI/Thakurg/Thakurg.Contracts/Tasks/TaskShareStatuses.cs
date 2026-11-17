namespace Thakurg.Contracts.Tasks;

// Where a share stands: waiting for the person to accept it, accepted (the task is in their Shared with me tab) or declined.
public static class TaskShareStatuses
{
    public const string Pending = "pending";

    public const string Accepted = "accepted";

    public const string Declined = "declined";
}
