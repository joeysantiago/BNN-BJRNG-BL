namespace Thakurg.Contracts.Auth;

public class UserDto
{
    public int Id { get; set; }

    public bool IsAdmin { get; set; }

    public List<string> Apps { get; set; } = [];

    public string Email { get; set; } = string.Empty;

    public string Language { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;
}
