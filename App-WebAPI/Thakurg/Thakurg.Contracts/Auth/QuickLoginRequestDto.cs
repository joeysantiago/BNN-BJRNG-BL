namespace Thakurg.Contracts.Auth;

// Settings > General > Quick logins: shows (true) or hides (false) an existing user on the login page.
public class QuickLoginRequestDto
{
    public bool ShowOnLogin { get; set; }

    public string Email { get; set; } = string.Empty;
}
