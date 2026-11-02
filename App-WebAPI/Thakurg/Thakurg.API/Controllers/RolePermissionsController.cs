using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Roles;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// The Role rights tab of the Settings page: the pages a role is given, and its View / Add / Edit / Delete rights on each. Each action needs that right of the caller's role.
[ApiController]
[Route("api/admin/role-permissions")]
public class RolePermissionsController : ControllerBase
{
    private readonly IRolePermissionService _permissionService;

    public RolePermissionsController(IRolePermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    #region Public Methods

    [HttpDelete("{permissionId:int}")]
    [HasPermission(PageCodes.Permissions, PermissionActions.Delete)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(int permissionId, CancellationToken cancellationToken)
    {
        var message = await _permissionService.DeleteAsync(HttpContext.AuthCaller(), permissionId, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpGet]
    [HasPermission(PageCodes.Permissions, PermissionActions.View)]
    public async Task<ActionResult<ApiResponse<RolePermissionListDto>>> List([FromQuery] int roleId, CancellationToken cancellationToken)
    {
        var list = await _permissionService.GetAsync(roleId, cancellationToken);

        return Ok(ApiResponse<RolePermissionListDto>.SuccessResponse(list));
    }

    [HttpPost]
    [HasPermission(PageCodes.Permissions, PermissionActions.Add)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<RolePermissionDto>>> Create([FromBody] RolePermissionSaveDto request, CancellationToken cancellationToken)
    {
        var result = await _permissionService.CreateAsync(HttpContext.AuthCaller(), request, cancellationToken);

        return Ok(ApiResponse<RolePermissionDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPut("{permissionId:int}")]
    [HasPermission(PageCodes.Permissions, PermissionActions.Edit)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<RolePermissionDto>>> Update(int permissionId, [FromBody] RolePermissionSaveDto request, CancellationToken cancellationToken)
    {
        var result = await _permissionService.UpdateAsync(HttpContext.AuthCaller(), permissionId, request, cancellationToken);

        return Ok(ApiResponse<RolePermissionDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
