namespace Thakurg.Contracts.Auth;

// A user shown as a one-tap login on the login page (Users.ShowOnLogin). The e-mail only: a tap logs in as them on the server.
public class QuickLoginDto
{
    public int Id { get; set; }

    public string Email { get; set; } = string.Empty;
}
