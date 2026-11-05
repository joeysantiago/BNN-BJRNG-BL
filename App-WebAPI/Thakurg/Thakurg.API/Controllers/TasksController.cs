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

// The tasks of the caller (My Tasks). Only users with access to the app (or administrators) get here, each sees only their own tasks, and the App Lock is checked first.
[ApiController]
[Route("api/tasks/items")]
[Authorize(Policy = AuthPolicies.Tasks)]
[TypeFilter(typeof(TasksProfileFilter))]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;

    public TasksController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    #region Public Methods

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<TaskDto>>>> Get(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<List<TaskDto>>.SuccessResponse(await _taskService.GetAllAsync(HttpContext.TaskCaller(), cancellationToken)));
    }

    [HttpGet("deleted")]
    public async Task<ActionResult<ApiResponse<List<TaskDto>>>> Deleted(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<List<TaskDto>>.SuccessResponse(await _taskService.GetDeletedAsync(HttpContext.TaskCaller(), cancellationToken)));
    }

    [HttpDelete("{taskId:int}")]
    public async Task<ActionResult<ApiResponse<TaskChangesDto>>> Delete(int taskId, CancellationToken cancellationToken)
    {
        return Changes(await _taskService.DeleteAsync(HttpContext.TaskCaller(), taskId, cancellationToken));
    }

    [HttpPost("{taskId:int}/reopen")]
    public async Task<ActionResult<ApiResponse<TaskChangesDto>>> Reopen(int taskId, CancellationToken cancellationToken)
    {
        return Changes(await _taskService.ReopenAsync(HttpContext.TaskCaller(), taskId, cancellationToken));
    }

    [HttpPost("{taskId:int}/restore")]
    public async Task<ActionResult<ApiResponse<TaskChangesDto>>> Restore(int taskId, CancellationToken cancellationToken)
    {
        return Changes(await _taskService.RestoreAsync(HttpContext.TaskCaller(), taskId, cancellationToken));
    }

    [HttpPost("{taskId:int}/complete")]
    public async Task<ActionResult<ApiResponse<TaskChangesDto>>> Complete(int taskId, CancellationToken cancellationToken)
    {
        return Changes(await _taskService.CompleteAsync(HttpContext.TaskCaller(), taskId, cancellationToken));
    }

    [HttpPost("{taskId:int}/duplicate")]
    public async Task<ActionResult<ApiResponse<TaskChangesDto>>> Duplicate(int taskId, CancellationToken cancellationToken)
    {
        return Changes(await _taskService.DuplicateAsync(HttpContext.TaskCaller(), taskId, cancellationToken));
    }

    [HttpGet("{taskId:int}/history")]
    public async Task<ActionResult<ApiResponse<List<TaskHistoryDto>>>> History(int taskId, CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<List<TaskHistoryDto>>.SuccessResponse(await _taskService.GetHistoryAsync(HttpContext.TaskCaller(), taskId, cancellationToken)));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<TaskChangesDto>>> Create([FromBody] TaskRequestDto request, CancellationToken cancellationToken)
    {
        return Changes(await _taskService.CreateAsync(HttpContext.TaskCaller(), request, cancellationToken));
    }

    [HttpPost("bulk")]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<TaskChangesDto>>> Bulk([FromBody] TaskBulkRequestDto request, CancellationToken cancellationToken)
    {
        return Changes(await _taskService.BulkAsync(HttpContext.TaskCaller(), request, cancellationToken));
    }

    [HttpPut("{taskId:int}")]
    public async Task<ActionResult<ApiResponse<TaskChangesDto>>> Update(int taskId, [FromBody] TaskRequestDto request, CancellationToken cancellationToken)
    {
        return Changes(await _taskService.UpdateAsync(HttpContext.TaskCaller(), taskId, request, cancellationToken));
    }

    [HttpPut("{taskId:int}/checklist/{itemId:int}")]
    public async Task<ActionResult<ApiResponse<TaskChangesDto>>> Toggle(int taskId, int itemId, [FromBody] TaskChecklistToggleDto request, CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<TaskChangesDto>.SuccessResponse(await _taskService.ToggleChecklistAsync(HttpContext.TaskCaller(), taskId, itemId, request.IsDone, cancellationToken)));
    }

    #endregion

    #region Private Methods

    private OkObjectResult Changes(ServiceResultDto<TaskChangesDto> result)
    {
        return Ok(ApiResponse<TaskChangesDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
