using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// The Users tab of the Settings page: add, change and delete users, their role and the apps each may open. Each action needs that right of the caller's role.
[ApiController]
[Route("api/admin/users")]
public class UserAccessController : ControllerBase
{
    private readonly IUserAccessService _accessService;

    public UserAccessController(IUserAccessService accessService)
    {
        _accessService = accessService;
    }

    #region Public Methods

    [HttpDelete("{userId:int}")]
    [HasPermission(PageCodes.Users, PermissionActions.Delete)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(int userId, CancellationToken cancellationToken)
    {
        var message = await _accessService.DeleteAsync(HttpContext.AuthCaller(), userId, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    // An archived user cannot log in until activated again.
    [HttpPut("{userId:int}/archive")]
    [HasPermission(PageCodes.Users, PermissionActions.Edit)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Archive(int userId, CancellationToken cancellationToken)
    {
        var message = await _accessService.SetActiveAsync(HttpContext.AuthCaller(), userId, false, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    // Brings a deleted user back (an archived one stays archived).
    [HttpPut("{userId:int}/restore")]
    [HasPermission(PageCodes.Users, PermissionActions.Edit)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Restore(int userId, CancellationToken cancellationToken)
    {
        var message = await _accessService.RestoreAsync(HttpContext.AuthCaller(), userId, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpPut("{userId:int}/activate")]
    [HasPermission(PageCodes.Users, PermissionActions.Edit)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Activate(int userId, CancellationToken cancellationToken)
    {
        var message = await _accessService.SetActiveAsync(HttpContext.AuthCaller(), userId, true, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpGet]
    [HasPermission(PageCodes.Users, PermissionActions.View)]
    public async Task<ActionResult<ApiResponse<UserAccessDto>>> List([FromQuery] string? status, CancellationToken cancellationToken)
    {
        var access = await _accessService.GetAsync(status, cancellationToken);

        return Ok(ApiResponse<UserAccessDto>.SuccessResponse(access));
    }

    [HttpPost]
    [HasPermission(PageCodes.Users, PermissionActions.Add)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<UserDto>>> Create([FromBody] UserCreateDto request, CancellationToken cancellationToken)
    {
        var result = await _accessService.CreateAsync(HttpContext.AuthCaller(), request, cancellationToken);

        return Ok(ApiResponse<UserDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPut("{userId:int}")]
    [HasPermission(PageCodes.Users, PermissionActions.Edit)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<UserDto>>> Update(int userId, [FromBody] UserAccessUpdateDto request, CancellationToken cancellationToken)
    {
        var result = await _accessService.UpdateAsync(HttpContext.AuthCaller(), userId, request, cancellationToken);

        return Ok(ApiResponse<UserDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
