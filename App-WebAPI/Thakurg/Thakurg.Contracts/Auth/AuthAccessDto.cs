namespace Thakurg.Contracts.Auth;

// What an active session may do: administrator or not, and the apps its user may open. Kept in memory for a short time (Auth:SessionCacheSeconds).
public class AuthAccessDto
{
    public bool IsAdmin { get; set; }

    public List<string> Apps { get; set; } = [];
}
