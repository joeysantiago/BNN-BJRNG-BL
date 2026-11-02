namespace Thakurg.Contracts.Roles;

// Gives a role rights on a page (add), or changes them (edit; RoleId and PageId are then ignored).
public class RolePermissionSaveDto
{
    public int PageId { get; set; }

    public int RoleId { get; set; }

    public bool CanAdd { get; set; }

    public bool CanEdit { get; set; }

    public bool CanView { get; set; }

    public bool CanDelete { get; set; }
}
