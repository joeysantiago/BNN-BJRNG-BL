namespace Thakurg.Contracts.Auth;

// Authentication scheme and authorization policies of the common login. User = logged in, Admin = a super admin or an admin, App* = logged in with access to that app,
// Perm:<page>:<action> = a right of the user's role on a Settings page (PermissionNames.Policy; a super admin has every right),
// SuperAdminPassword = a super admin who logged in with the password (never a one-time code session).
public static class AuthPolicies
{
    public const string User = "AuthUser";

    public const string AppPrefix = "App:";

    public const string Scheme = "Thakurg";

    public const string Admin = "AuthAdmin";

    public const string PermissionPrefix = "Perm:";

    public const string Khata = AppPrefix + AppCodes.Khata;

    public const string Tracker = AppPrefix + AppCodes.Tracker;

    public const string Youtube = AppPrefix + AppCodes.Youtube;

    public const string SuperAdminPassword = "AuthSuperAdminPassword";
}
