using Thakurg.Contracts.Auth;

namespace Thakurg.Infrastructure.Common;

// A session that did not log in with the password (a one-time code, LoginMethods.Otp) opens only the apps in Auth:Otp:Apps
// and never has administrator rights, the admin / super admin role or rights on the Settings pages.
public static class LoginMethodAccess
{
    #region Public Methods

    public static bool IsPassword(string? loginMethod)
    {
        return loginMethod == LoginMethods.Password;
    }

    public static string RoleFor(string roleCode, string? loginMethod)
    {
        return IsPassword(loginMethod) || !RoleCodes.IsAdmin(roleCode) ? roleCode : RoleCodes.Standard;
    }

    // The account as shown to the UI: limited for a one-time code session; left whole when the session is not known (the picture upload answers).
    public static UserDto Limit(UserDto user, IReadOnlyCollection<string> otpApps)
    {
        if (user.LoginMethod != LoginMethods.Otp)
            return user;

        user.IsAdmin = false;
        user.Permissions = [];
        user.RoleCode = RoleFor(user.RoleCode, user.LoginMethod);
        user.Apps = user.Apps.Where(otpApps.Contains).ToList();

        return user;
    }

    public static AuthAccessDto Limit(AuthAccessDto access, string? loginMethod, IReadOnlyCollection<string> otpApps)
    {
        if (IsPassword(loginMethod))
            return access;

        return new AuthAccessDto { RoleCode = RoleFor(access.RoleCode, loginMethod), IsAdmin = false, Permissions = [], Apps = access.Apps.Where(otpApps.Contains).ToList() };
    }

    #endregion
}
