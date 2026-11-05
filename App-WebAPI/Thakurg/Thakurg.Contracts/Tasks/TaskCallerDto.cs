namespace Thakurg.Contracts.Tasks;

// Who calls a My Tasks endpoint: the TaskUsers row, the common account, its login session and whether it is a super admin.
public class TaskCallerDto
{
    public int UserId { get; set; }

    public int SessionId { get; set; }

    public bool IsSuperAdmin { get; set; }

    public int AccountUserId { get; set; }
}
