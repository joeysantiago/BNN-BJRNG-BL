namespace Thakurg.Contracts.Auth;

// Claim names of the common login. The token carries only sub and sid; adm, rol, prm and app are added from the database on every request, so access changes apply at once.
public static class AuthClaimTypes
{
    public const string App = "app";

    public const string Role = "rol";

    public const string Admin = "adm";

    public const string Session = "sid";

    public const string Subject = "sub";

    public const string Permission = "prm";
}
