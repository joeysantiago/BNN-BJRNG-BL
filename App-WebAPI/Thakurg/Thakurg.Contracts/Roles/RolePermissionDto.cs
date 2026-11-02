namespace Thakurg.Contracts.Roles;

public class RolePermissionDto
{
    public int Id { get; set; }

    public int PageId { get; set; }

    public int RoleId { get; set; }

    public bool CanAdd { get; set; }

    public bool CanEdit { get; set; }

    public bool CanView { get; set; }

    public bool CanDelete { get; set; }

    public string PageCode { get; set; } = string.Empty;
}
