namespace Thakurg.Contracts.Auth;

// A user added on the Users tab by a super admin or an admin, with the role chosen in the dropdown.
public class UserCreateDto
{
    public int RoleId { get; set; }

    public string? Email { get; set; }

    public string? Password { get; set; }

    public string? DisplayName { get; set; }

    public List<string> Apps { get; set; } = [];
}
