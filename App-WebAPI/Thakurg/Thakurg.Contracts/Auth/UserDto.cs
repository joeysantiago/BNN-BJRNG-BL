namespace Thakurg.Contracts.Auth;

// An account. Permissions ("settings.users:edit") are the rights of its role; a super admin has every right. HiddenFeatures are the options the user switched off for themselves.
public class UserDto
{
    public int Id { get; set; }

    public int RoleId { get; set; }

    public bool IsAdmin { get; set; }

    public List<string> Apps { get; set; } = [];

    public string Email { get; set; } = string.Empty;

    public List<string> Permissions { get; set; } = [];

    public string Language { get; set; } = string.Empty;

    public string RoleCode { get; set; } = string.Empty;

    public string RoleName { get; set; } = string.Empty;

    public List<string> HiddenFeatures { get; set; } = [];

    public string DisplayName { get; set; } = string.Empty;
}
