using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// The logged-in user's mobile number, postal address and company (UserProfiles).
[ApiController]
[Route("api/auth/me/details")]
[Authorize(Policy = AuthPolicies.User)]
public class ProfileDetailsController : ControllerBase
{
    private readonly IUserProfileService _profileService;

    public ProfileDetailsController(IUserProfileService profileService)
    {
        _profileService = profileService;
    }

    #region Public Methods

    [HttpGet]
    public async Task<ActionResult<ApiResponse<ProfileDetailsDto>>> Get(CancellationToken cancellationToken)
    {
        var details = await _profileService.GetAsync(HttpContext.AuthCaller().UserId, cancellationToken);

        return Ok(ApiResponse<ProfileDetailsDto>.SuccessResponse(details));
    }

    [HttpPut]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<ProfileDetailsDto>>> Save([FromBody] ProfileDetailsDto request, CancellationToken cancellationToken)
    {
        var result = await _profileService.SaveAsync(HttpContext.AuthCaller().UserId, request, cancellationToken);

        return Ok(ApiResponse<ProfileDetailsDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
