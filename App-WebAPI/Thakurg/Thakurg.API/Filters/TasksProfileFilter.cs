using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;

namespace Thakurg.API.Filters;

// Runs before every My Tasks endpoint: finds (or makes) the My Tasks profile of the caller, then checks the App Lock on the server, so hiding the screen is never the only protection.
public class TasksProfileFilter : IAsyncActionFilter
{
    private readonly ITaskPinService _pinService;

    private readonly ITaskProfileService _profileService;

    public TasksProfileFilter(ITaskProfileService profileService, ITaskPinService pinService)
    {
        _profileService = profileService;
        _pinService = pinService;
    }

    #region Public Methods

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpContext = context.HttpContext;
        var cancellationToken = httpContext.RequestAborted;
        httpContext.Items[TasksHttpExtensions.ItemKey] = await _profileService.ResolveAsync(httpContext.AuthCaller().UserId, cancellationToken);

        if (!IsLockFree(context))
            await _pinService.EnsureUnlockedAsync(httpContext.TaskCaller(), cancellationToken);

        await next();
    }

    #endregion

    #region Private Methods

    private static bool IsLockFree(ActionExecutingContext context)
    {
        return context.ActionDescriptor is ControllerActionDescriptor action && (action.MethodInfo.IsDefined(typeof(TasksLockFreeAttribute), true) || action.ControllerTypeInfo.IsDefined(typeof(TasksLockFreeAttribute), true));
    }

    #endregion
}
