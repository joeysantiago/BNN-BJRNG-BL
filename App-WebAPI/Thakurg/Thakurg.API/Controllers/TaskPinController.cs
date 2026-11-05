using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Extensions;
using Thakurg.API.Filters;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// The App Lock of My Tasks: its own PIN, independent from SnapKhata. These calls work while the app is locked, except Keep, which only keeps an open app open.
[ApiController]
[Route("api/tasks/pin")]
[Authorize(Policy = AuthPolicies.Tasks)]
[TypeFilter(typeof(TasksProfileFilter))]
public class TaskPinController : ControllerBase
{
    private readonly ITaskPinService _pinService;

    public TaskPinController(ITaskPinService pinService)
    {
        _pinService = pinService;
    }

    #region Public Methods

    [HttpGet]
    [TasksLockFree]
    public async Task<ActionResult<ApiResponse<TaskPinStatusDto>>> Get(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<TaskPinStatusDto>.SuccessResponse(await _pinService.GetStatusAsync(HttpContext.TaskCaller(), cancellationToken)));
    }

    [HttpPost("keep")]
    public async Task<ActionResult<ApiResponse<TaskPinStatusDto>>> Keep(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<TaskPinStatusDto>.SuccessResponse(await _pinService.GetStatusAsync(HttpContext.TaskCaller(), cancellationToken)));
    }

    [HttpPost("lock")]
    [TasksLockFree]
    public async Task<ActionResult<ApiResponse<TaskPinStatusDto>>> Lock(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<TaskPinStatusDto>.SuccessResponse(await _pinService.LockAsync(HttpContext.TaskCaller(), cancellationToken)));
    }

    [HttpPut]
    [TasksLockFree]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<TaskPinStatusDto>>> Set([FromBody] TaskPinRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _pinService.SetAsync(HttpContext.TaskCaller(), request, cancellationToken);

        return Ok(ApiResponse<TaskPinStatusDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPost("verify")]
    [TasksLockFree]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<TaskPinStatusDto>>> Verify([FromBody] TaskPinRequestDto request, CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<TaskPinStatusDto>.SuccessResponse(await _pinService.VerifyAsync(HttpContext.TaskCaller(), request, cancellationToken)));
    }

    [HttpPost("remove")]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<TaskPinStatusDto>>> Remove([FromBody] TaskPinRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _pinService.RemoveAsync(HttpContext.TaskCaller(), request, cancellationToken);

        return Ok(ApiResponse<TaskPinStatusDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
