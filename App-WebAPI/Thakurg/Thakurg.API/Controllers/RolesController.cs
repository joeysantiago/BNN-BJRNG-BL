using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Roles;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// The Roles tab of the Settings page: add, change and delete roles. Each action needs that right of the caller's role.
[ApiController]
[Route("api/admin/roles")]
public class RolesController : ControllerBase
{
    private readonly IRoleService _roleService;

    public RolesController(IRoleService roleService)
    {
        _roleService = roleService;
    }

    #region Public Methods

    [HttpGet]
    [HasPermission(PageCodes.Roles, PermissionActions.View)]
    public async Task<ActionResult<ApiResponse<List<RoleDto>>>> List(CancellationToken cancellationToken)
    {
        var roles = await _roleService.GetAsync(cancellationToken);

        return Ok(ApiResponse<List<RoleDto>>.SuccessResponse(roles));
    }

    [HttpDelete("{roleId:int}")]
    [HasPermission(PageCodes.Roles, PermissionActions.Delete)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(int roleId, CancellationToken cancellationToken)
    {
        var message = await _roleService.DeleteAsync(HttpContext.AuthCaller(), roleId, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpPost]
    [HasPermission(PageCodes.Roles, PermissionActions.Add)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<RoleDto>>> Create([FromBody] RoleSaveDto request, CancellationToken cancellationToken)
    {
        var result = await _roleService.CreateAsync(HttpContext.AuthCaller(), request, cancellationToken);

        return Ok(ApiResponse<RoleDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPut("{roleId:int}")]
    [HasPermission(PageCodes.Roles, PermissionActions.Edit)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<RoleDto>>> Update(int roleId, [FromBody] RoleSaveDto request, CancellationToken cancellationToken)
    {
        var result = await _roleService.UpdateAsync(HttpContext.AuthCaller(), roleId, request, cancellationToken);

        return Ok(ApiResponse<RoleDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
