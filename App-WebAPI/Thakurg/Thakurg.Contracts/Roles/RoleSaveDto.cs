namespace Thakurg.Contracts.Roles;

// A role added or changed on the Roles tab. The code of a built-in role cannot change.
public class RoleSaveDto
{
    public string? Code { get; set; }

    public string? Name { get; set; }

    public int SortOrder { get; set; }

    public bool IsDefault { get; set; }

    public string? Description { get; set; }
}
