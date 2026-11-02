namespace Thakurg.Contracts.Auth;

// Codes of the built-in roles (Roles table, Common/008_Roles.sql). A super admin has every right; an admin cannot change super admins.
public static class RoleCodes
{
    public const string Admin = "admin";

    public const string Standard = "standard";

    public const string SuperAdmin = "super-admin";

    #region Public Methods

    // Super admins and admins are the site's administrators: they open every app and pass AuthPolicies.Admin.
    public static bool IsAdmin(string? code)
    {
        return code is SuperAdmin or Admin;
    }

    #endregion
}
