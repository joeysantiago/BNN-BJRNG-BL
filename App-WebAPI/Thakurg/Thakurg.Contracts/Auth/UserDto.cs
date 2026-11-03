namespace Thakurg.Contracts.Auth;

// An account. Avatar is the picture's file name (null = none; it changes with every upload, so the picture URL can be cached). Permissions ("settings.users:edit") are the rights of its role; a super admin has every right. HiddenFeatures are the options the user switched off for themselves. LoginMethod is how this session logged in (LoginMethods: password or otp).
public class UserDto
{
    public int Id { get; set; }

    public int RoleId { get; set; }

    public bool IsAdmin { get; set; }

    public bool IsDeleted { get; set; }

    public string? Avatar { get; set; }

    public bool IsArchived { get; set; }

    public DateTime CreatedOn { get; set; }

    public DateTime? LastLoginOn { get; set; }

    public List<string> Apps { get; set; } = [];

    public string Email { get; set; } = string.Empty;

    public List<string> Permissions { get; set; } = [];

    public string Language { get; set; } = string.Empty;

    public string RoleCode { get; set; } = string.Empty;

    public string RoleName { get; set; } = string.Empty;

    public List<string> HiddenFeatures { get; set; } = [];

    public string DisplayName { get; set; } = string.Empty;

    public string LoginMethod { get; set; } = string.Empty;
}
