using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Extensions;
using Thakurg.API.Filters;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// The My Tasks account of the caller: "Delete my account" removes their tasks, pictures and settings in this app and their access to it (the common account stays).
// It needs the App Lock open, like every other task call.
[ApiController]
[Route("api/tasks/me")]
[Authorize(Policy = AuthPolicies.Tasks)]
[TypeFilter(typeof(TasksProfileFilter))]
public class TaskAccountController : ControllerBase
{
    private readonly ITaskProfileService _profileService;

    public TaskAccountController(ITaskProfileService profileService)
    {
        _profileService = profileService;
    }

    #region Public Methods

    [HttpDelete]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<object?>.SuccessResponse(null, await _profileService.DeleteAsync(HttpContext.TaskCaller(), cancellationToken)));
    }

    #endregion
}
