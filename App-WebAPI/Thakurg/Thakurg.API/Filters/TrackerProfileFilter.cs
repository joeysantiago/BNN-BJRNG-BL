using Microsoft.AspNetCore.Mvc.Filters;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;

namespace Thakurg.API.Filters;

// Runs before every SnapTracker endpoint: finds (or makes) the SnapTracker profile of the caller, so every query is limited to that user's rows.
public class TrackerProfileFilter : IAsyncActionFilter
{
    private readonly ITrackerProfileService _profileService;

    public TrackerProfileFilter(ITrackerProfileService profileService)
    {
        _profileService = profileService;
    }

    #region Public Methods

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpContext = context.HttpContext;
        httpContext.Items[TrackerHttpExtensions.ItemKey] = await _profileService.ResolveAsync(httpContext.AuthCaller().UserId, httpContext.RequestAborted);

        await next();
    }

    #endregion
}
