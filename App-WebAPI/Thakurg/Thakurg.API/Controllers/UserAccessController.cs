using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// The Users and access panel of the master page: administrators tick which apps each user may open, and who else is an administrator.
[ApiController]
[Route("api/admin/users")]
[Authorize(Policy = AuthPolicies.Admin)]
public class UserAccessController : ControllerBase
{
    private readonly IUserAccessService _accessService;

    public UserAccessController(IUserAccessService accessService)
    {
        _accessService = accessService;
    }

    #region Public Methods

    [HttpGet]
    public async Task<ActionResult<ApiResponse<UserAccessDto>>> List(CancellationToken cancellationToken)
    {
        var access = await _accessService.GetAsync(cancellationToken);

        return Ok(ApiResponse<UserAccessDto>.SuccessResponse(access));
    }

    [HttpPut("{userId:int}")]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<UserDto>>> Update(int userId, [FromBody] UserAccessUpdateDto request, CancellationToken cancellationToken)
    {
        var result = await _accessService.UpdateAsync(HttpContext.AuthCaller().UserId, userId, request, cancellationToken);

        return Ok(ApiResponse<UserDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
