namespace Thakurg.Contracts.Auth;

public class SignInDto
{
    public DateTime RefreshExpiresOn { get; set; }

    public AuthResultDto Auth { get; set; } = new();

    public string RefreshToken { get; set; } = string.Empty;
}
