namespace Thakurg.Contracts.Auth;

public class AuthResultDto
{
    public int ExpiresInSeconds { get; set; }

    public UserDto User { get; set; } = new();

    public string AccessToken { get; set; } = string.Empty;
}
