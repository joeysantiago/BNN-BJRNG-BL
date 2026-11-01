namespace Thakurg.Contracts.Configurations;

public class AuthCookieOptions
{
    public string Name { get; set; } = string.Empty;

    public string Path { get; set; } = string.Empty;

    public string SameSite { get; set; } = string.Empty;
}
