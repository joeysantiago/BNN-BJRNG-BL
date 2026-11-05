namespace Thakurg.Contracts.Auth;

// The ?status= filter of GET api/admin/users. Active can log in; Archived (IsActive = false) cannot until activated; Deleted (IsSoftDeleted) is gone; All is every one of them.
public static class UserStatuses
{
    public const string All = "all";

    public const string Active = "active";

    public const string Deleted = "deleted";

    public const string Archived = "archived";
}
