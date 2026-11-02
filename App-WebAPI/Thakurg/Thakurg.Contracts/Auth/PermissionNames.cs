namespace Thakurg.Contracts.Auth;

// One right written as text: "settings.users:edit" in the session's claims and in UserDto.Permissions, "Perm:settings.users:edit" as a policy name.
public static class PermissionNames
{
    #region Public Methods

    public static string Claim(string page, string action)
    {
        return $"{page}:{action}";
    }

    public static string Policy(string page, string action)
    {
        return AuthPolicies.PermissionPrefix + Claim(page, action);
    }

    // The rights of one RolePermissions row, as claims.
    public static IEnumerable<string> Expand(RolePermissionRow row)
    {
        if (row.CanView)
            yield return Claim(row.PageCode, PermissionActions.View);

        if (row.CanAdd)
            yield return Claim(row.PageCode, PermissionActions.Add);

        if (row.CanEdit)
            yield return Claim(row.PageCode, PermissionActions.Edit);

        if (row.CanDelete)
            yield return Claim(row.PageCode, PermissionActions.Delete);
    }

    #endregion
}
