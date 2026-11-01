using Microsoft.AspNetCore.Mvc.Filters;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;

namespace Thakurg.API.Filters;

// SnapKhata works with its own user Ids (KhataUsers). Before a Khata action runs, the logged-in account is mapped to its Khata profile
// (created on first use) and the Khata user Id is kept in HttpContext.Items for KhataHttpExtensions.KhataCaller().
public class KhataProfileFilter : IAsyncActionFilter
{
    public const string ItemKey = "KhataUserId";

    private readonly IKhataProfileService _profileService;

    public KhataProfileFilter(IKhataProfileService profileService)
    {
        _profileService = profileService;
    }

    #region Public Methods

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpContext = context.HttpContext;

        if (int.TryParse(httpContext.User.FindFirst(AuthClaimTypes.Subject)?.Value, out var accountUserId))
            httpContext.Items[ItemKey] = await _profileService.ResolveAsync(accountUserId, httpContext.RequestAborted);

        await next();
    }

    #endregion
}
