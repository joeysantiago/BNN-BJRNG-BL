namespace Thakurg.Contracts.Auth;

// Authentication scheme and authorization policies of the common login. User = logged in, Admin = an administrator, App* = logged in with access to that app.
public static class AuthPolicies
{
    public const string User = "AuthUser";

    public const string AppPrefix = "App:";

    public const string Scheme = "Thakurg";

    public const string Admin = "AuthAdmin";

    public const string Khata = AppPrefix + AppCodes.Khata;

    public const string Youtube = AppPrefix + AppCodes.Youtube;
}
