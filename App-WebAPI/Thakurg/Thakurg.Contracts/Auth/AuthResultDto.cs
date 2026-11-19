namespace Thakurg.Contracts.Auth;

public class AuthResultDto
{
    public int ExpiresInSeconds { get; set; }

    // Only for the Android app (Auth:NativeAppOrigins), which keeps it on the device; browsers get it only as the HttpOnly cookie.
    public string? RefreshToken { get; set; }

    public UserDto User { get; set; } = new();

    public string AccessToken { get; set; } = string.Empty;
}
