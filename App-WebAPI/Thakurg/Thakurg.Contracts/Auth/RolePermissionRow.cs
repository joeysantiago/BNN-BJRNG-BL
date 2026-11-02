namespace Thakurg.Contracts.Auth;

// One RolePermissions row with the code of its page, as the login reads it to build the session's rights.
public class RolePermissionRow
{
    public bool CanAdd { get; set; }

    public bool CanEdit { get; set; }

    public bool CanView { get; set; }

    public bool CanDelete { get; set; }

    public string PageCode { get; set; } = string.Empty;
}
