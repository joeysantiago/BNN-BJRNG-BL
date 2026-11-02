namespace Thakurg.Contracts.Roles;

public class RoleDto
{
    public int Id { get; set; }

    public bool IsSystem { get; set; }

    public int SortOrder { get; set; }

    public int UserCount { get; set; }

    public bool IsDefault { get; set; }

    public string? Description { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}
