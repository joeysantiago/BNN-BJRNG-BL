using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Thakurg.API.Extensions;
using Thakurg.API.Filters;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.API.Controllers;

// The task categories of the caller (My Tasks).
[ApiController]
[Route("api/tasks/categories")]
[Authorize(Policy = AuthPolicies.Tasks)]
[TypeFilter(typeof(TasksProfileFilter))]
public class TaskCategoriesController : ControllerBase
{
    private readonly ITaskCategoryService _categoryService;

    public TaskCategoriesController(ITaskCategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    #region Public Methods

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<TaskCategoryDto>>>> Get(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<List<TaskCategoryDto>>.SuccessResponse(await _categoryService.GetAsync(HttpContext.TaskCaller(), cancellationToken)));
    }

    [HttpDelete("{categoryId:int}")]
    public async Task<ActionResult<ApiResponse<int>>> Delete(int categoryId, CancellationToken cancellationToken)
    {
        var result = await _categoryService.DeleteAsync(HttpContext.TaskCaller(), categoryId, cancellationToken);

        return Ok(ApiResponse<int>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<TaskCategoryDto>>> Create([FromBody] TaskCategoryRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _categoryService.CreateAsync(HttpContext.TaskCaller(), request, cancellationToken);

        return Ok(ApiResponse<TaskCategoryDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPut("{categoryId:int}")]
    public async Task<ActionResult<ApiResponse<TaskCategoryDto>>> Update(int categoryId, [FromBody] TaskCategoryRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _categoryService.UpdateAsync(HttpContext.TaskCaller(), categoryId, request, cancellationToken);

        return Ok(ApiResponse<TaskCategoryDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
