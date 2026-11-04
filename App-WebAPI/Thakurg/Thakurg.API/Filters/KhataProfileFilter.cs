using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;

namespace Thakurg.API.Filters;

// SnapKhata works with its own user Ids (KhataUsers). Before a Khata action runs, the logged-in account is mapped to its Khata profile
// (created on first use) and the Khata user Id is kept in HttpContext.Items for KhataHttpExtensions.KhataCaller().
// Then the app lock: a session the installed app protects must be unlocked with the PIN, except for actions marked KhataLockFree.
public class KhataProfileFilter : IAsyncActionFilter
{
    public const string ItemKey = "KhataUserId";

    private readonly IKhataPinService _pinService;

    private readonly IKhataProfileService _profileService;

    public KhataProfileFilter(IKhataProfileService profileService, IKhataPinService pinService)
    {
        _profileService = profileService;
        _pinService = pinService;
    }

    #region Public Methods

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpContext = context.HttpContext;

        if (int.TryParse(httpContext.User.FindFirst(AuthClaimTypes.Subject)?.Value, out var accountUserId))
            httpContext.Items[ItemKey] = await _profileService.ResolveAsync(accountUserId, httpContext.RequestAborted);

        if (!IsLockFree(context))
            await _pinService.EnsureUnlockedAsync(httpContext.KhataCaller(), httpContext.RequestAborted);

        await next();
    }

    #endregion

    #region Private Methods

    private static bool IsLockFree(ActionExecutingContext context)
    {
        return context.ActionDescriptor is ControllerActionDescriptor action && (action.MethodInfo.IsDefined(typeof(KhataLockFreeAttribute), true) || action.ControllerTypeInfo.IsDefined(typeof(KhataLockFreeAttribute), true));
    }

    #endregion
}
