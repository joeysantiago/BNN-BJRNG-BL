namespace Thakurg.Contracts.Auth;

// The four rights a role can have on a page (RolePermissions: CanView, CanAdd, CanEdit, CanDelete).
public static class PermissionActions
{
    public const string Add = "add";

    public const string Edit = "edit";

    public const string View = "view";

    public const string Delete = "delete";

    public static readonly string[] All = [View, Add, Edit, Delete];
}
