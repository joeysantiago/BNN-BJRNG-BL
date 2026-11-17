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

// Sharing tasks (Tasks): the owner shares a task with another account (read or edit) and sees who has it; the other person accepts or declines,
// finds accepted tasks in Shared with me, and can remove them again. The App Lock is checked first, as on every Tasks endpoint.
[ApiController]
[Route("api/tasks")]
[Authorize(Policy = AuthPolicies.Tasks)]
[TypeFilter(typeof(TasksProfileFilter))]
public class TaskSharesController : ControllerBase
{
    private readonly ITaskShareService _shareService;

    public TaskSharesController(ITaskShareService shareService)
    {
        _shareService = shareService;
    }

    #region Public Methods

    [HttpDelete("shares/{shareId:int}")]
    public async Task<ActionResult<ApiResponse<int>>> Remove(int shareId, CancellationToken cancellationToken)
    {
        var result = await _shareService.RemoveAsync(HttpContext.TaskCaller(), shareId, cancellationToken);

        return Ok(ApiResponse<int>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPost("shares/{shareId:int}/decline")]
    public async Task<ActionResult<ApiResponse<int>>> Decline(int shareId, CancellationToken cancellationToken)
    {
        var result = await _shareService.DeclineAsync(HttpContext.TaskCaller(), shareId, cancellationToken);

        return Ok(ApiResponse<int>.SuccessResponse(result.Data, result.Message));
    }

    [HttpGet("shared")]
    public async Task<ActionResult<ApiResponse<List<TaskSharedDto>>>> Incoming(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<List<TaskSharedDto>>.SuccessResponse(await _shareService.GetIncomingAsync(HttpContext.TaskCaller(), cancellationToken)));
    }

    [HttpPost("shares/{shareId:int}/accept")]
    public async Task<ActionResult<ApiResponse<TaskSharedDto>>> Accept(int shareId, CancellationToken cancellationToken)
    {
        var result = await _shareService.AcceptAsync(HttpContext.TaskCaller(), shareId, cancellationToken);

        return Ok(ApiResponse<TaskSharedDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpGet("items/{taskId:int}/shares")]
    public async Task<ActionResult<ApiResponse<List<TaskShareDto>>>> Shares(int taskId, CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<List<TaskShareDto>>.SuccessResponse(await _shareService.GetSharesAsync(HttpContext.TaskCaller(), taskId, cancellationToken)));
    }

    // Looks accounts up by e-mail or mobile number, so it is rate limited like the other sensitive endpoints.
    [HttpPost("items/{taskId:int}/shares")]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<TaskShareDto>>> Share(int taskId, [FromBody] TaskShareRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _shareService.ShareAsync(HttpContext.TaskCaller(), taskId, request, cancellationToken);

        return Ok(ApiResponse<TaskShareDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
