namespace Thakurg.Contracts.Roles;

// The Role rights tab for one role: every role (the role dropdown), every page, and the rights the role has on the pages it was given.
public class RolePermissionListDto
{
    public int RoleId { get; set; }

    public List<PageDto> Pages { get; set; } = [];

    public List<RoleDto> Roles { get; set; } = [];

    public List<RolePermissionDto> Permissions { get; set; } = [];
}
