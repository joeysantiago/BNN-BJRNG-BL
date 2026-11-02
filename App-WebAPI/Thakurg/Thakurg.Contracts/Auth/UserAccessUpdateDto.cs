namespace Thakurg.Contracts.Auth;

public class UserAccessUpdateDto
{
    public int RoleId { get; set; }

    public string? DisplayName { get; set; }

    public List<string> Apps { get; set; } = [];
}
