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

    [HttpGet]
    [HasPermission(PageCodes.Users, PermissionActions.View)]
    public async Task<ActionResult<ApiResponse<UserAccessDto>>> List(CancellationToken cancellationToken)
    {
        var access = await _accessService.GetAsync(cancellationToken);

        return Ok(ApiResponse<UserAccessDto>.SuccessResponse(access));
    }

    [HttpDelete("{userId:int}")]
    [HasPermission(PageCodes.Users, PermissionActions.Delete)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(int userId, CancellationToken cancellationToken)
    {
        var message = await _accessService.DeleteAsync(HttpContext.AuthCaller(), userId, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
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
