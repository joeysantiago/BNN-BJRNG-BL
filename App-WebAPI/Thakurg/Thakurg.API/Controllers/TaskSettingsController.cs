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

// The My Tasks settings of the caller, and the name of the app (super admins only; the service checks it).
[ApiController]
[Route("api/tasks/settings")]
[Authorize(Policy = AuthPolicies.Tasks)]
[TypeFilter(typeof(TasksProfileFilter))]
public class TaskSettingsController : ControllerBase
{
    private readonly ITaskSettingsService _settingsService;

    public TaskSettingsController(ITaskSettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    #region Public Methods

    [HttpGet]
    public async Task<ActionResult<ApiResponse<TaskSettingsDto>>> Get(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<TaskSettingsDto>.SuccessResponse(await _settingsService.GetAsync(HttpContext.TaskCaller(), cancellationToken)));
    }

    [HttpPost("whatsapp-test")]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> TestWhatsApp(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<object?>.SuccessResponse(null, await _settingsService.TestWhatsAppAsync(HttpContext.TaskCaller(), cancellationToken)));
    }

    [HttpPut]
    public async Task<ActionResult<ApiResponse<TaskSettingsDto>>> Save([FromBody] TaskSettingsRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _settingsService.SaveAsync(HttpContext.TaskCaller(), request, cancellationToken);

        return Ok(ApiResponse<TaskSettingsDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPut("app-name")]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<Dictionary<string, string>>>> Rename([FromBody] TaskAppNameRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _settingsService.RenameAsync(HttpContext.TaskCaller(), request, cancellationToken);

        return Ok(ApiResponse<Dictionary<string, string>>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
