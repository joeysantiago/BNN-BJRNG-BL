using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Settings;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;

    public SettingsController(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    #region Public Methods

    [HttpGet]
    public async Task<ActionResult<ApiResponse<AppSettingsDto>>> Get(CancellationToken cancellationToken)
    {
        var settings = await _settingsService.GetAsync(cancellationToken);

        return Ok(ApiResponse<AppSettingsDto>.SuccessResponse(settings));
    }

    // Each part needs the Edit right of its Settings tab: features and gauge = Site options, connection rows, services.
    [HttpPut]
    [Authorize(Policy = AuthPolicies.User)]
    [EnableRateLimiting("sensitive")]
    public async Task<ActionResult<ApiResponse<AppSettingsDto>>> Save([FromBody] SettingsUpdateDto request, CancellationToken cancellationToken)
    {
        if (!CanSave(request))
            return Forbid();

        var result = await _settingsService.SaveAsync(request, cancellationToken);

        return Ok(ApiResponse<AppSettingsDto>.SuccessResponse(result.Data, result.Message));
    }

    // Where the code that checks a new sign-up goes (e-mail, WhatsApp or SMS): a super admin only.
    [HttpPut("signup-verification")]
    [Authorize(Policy = AuthPolicies.User)]
    [EnableRateLimiting("sensitive")]
    public async Task<ActionResult<ApiResponse<AppSettingsDto>>> SaveSignupVerification([FromBody] SignupVerificationUpdateDto request, CancellationToken cancellationToken)
    {
        if (!User.HasClaim(AuthClaimTypes.Role, RoleCodes.SuperAdmin))
            return Forbid();

        var result = await _settingsService.SaveSignupVerificationAsync(request, cancellationToken);

        return Ok(ApiResponse<AppSettingsDto>.SuccessResponse(result.Data, result.Message));
    }

    // The name of one app (or page) in every language, shown to everyone: a super admin only.
    [HttpPut("app-names/{pageCode}")]
    [Authorize(Policy = AuthPolicies.User)]
    [EnableRateLimiting("sensitive")]
    public async Task<ActionResult<ApiResponse<Dictionary<string, string>>>> Rename(string pageCode, [FromBody] AppNameUpdateDto request, CancellationToken cancellationToken)
    {
        if (!User.HasClaim(AuthClaimTypes.Role, RoleCodes.SuperAdmin))
            return Forbid();

        var result = await _settingsService.RenameAsync(HttpContext.AuthCaller().UserId, pageCode, request, cancellationToken);

        return Ok(ApiResponse<Dictionary<string, string>>.SuccessResponse(result.Data, result.Message));
    }

    #endregion

    #region Private Methods

    private bool CanSave(SettingsUpdateDto request)
    {
        var features = (request.Features is null && request.Speed is null) || User.HasPermission(PageCodes.Features, PermissionActions.Edit);
        var connection = request.Connection is null || User.HasPermission(PageCodes.Connection, PermissionActions.Edit);
        var services = request.Services is null || User.HasPermission(PageCodes.Services, PermissionActions.Edit);

        return features && connection && services;
    }

    #endregion
}
