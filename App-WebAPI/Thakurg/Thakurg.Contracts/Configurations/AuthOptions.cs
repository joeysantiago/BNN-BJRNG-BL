namespace Thakurg.Contracts.Configurations;

// The common login (Auth in appsettings.json): tokens, cookies, password rules, lockout and the e-mail addresses that sign up as administrators.
public class AuthOptions
{
    public int LockoutMinutes { get; set; }

    public int MaxFailedLogins { get; set; }

    public const string SectionName = "Auth";

    public int PasswordMinLength { get; set; }

    public AuthJwtOptions Jwt { get; set; } = new();

    public List<string> AdminEmails { get; set; } = [];

    public AuthCookieOptions AccessCookie { get; set; } = new();

    public AuthCookieOptions RefreshCookie { get; set; } = new();
}
