using Microsoft.AspNetCore.Authorization;
using Thakurg.Contracts.Auth;

namespace Thakurg.Infrastructure.Security;

// [HasPermission(PageCodes.Users, PermissionActions.Edit)]: the caller's role must have that right on that page (a super admin has every right).
// The policy behind it is registered for every page and action in AuthSecurityExtensions.
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class HasPermissionAttribute : AuthorizeAttribute
{
    public HasPermissionAttribute(string page, string action) : base(PermissionNames.Policy(page, action))
    {
    }
}
