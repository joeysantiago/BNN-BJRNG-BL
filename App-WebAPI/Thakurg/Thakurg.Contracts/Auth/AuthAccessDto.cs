namespace Thakurg.Contracts.Auth;

// What an active session may do: its role, administrator or not, its rights on the Settings pages and the apps its user may open.
// Kept in memory for a short time (Auth:SessionCacheSeconds).
public class AuthAccessDto
{
    public bool IsAdmin { get; set; }

    public List<string> Apps { get; set; } = [];

    public List<string> Permissions { get; set; } = [];

    public string RoleCode { get; set; } = string.Empty;
}
