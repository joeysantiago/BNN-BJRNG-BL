using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// The common login of every app: sign up, log in, refresh, log out, and the logged-in user's own profile, password and page options.
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthOptions _auth;

    private readonly IAuthService _authService;

    public AuthController(IAuthService authService, IOptions<AuthOptions> options)
    {
        _authService = authService;
        _auth = options.Value;
    }

    #region Public Methods

    [HttpGet("me")]
    [Authorize(Policy = AuthPolicies.User)]
    public async Task<ActionResult<ApiResponse<UserDto>>> Me(CancellationToken cancellationToken)
    {
        var user = await _authService.GetMeAsync(HttpContext.AuthCaller(), cancellationToken);

        return Ok(ApiResponse<UserDto>.SuccessResponse(user));
    }

    [HttpPost("logout")]
    [Authorize(Policy = AuthPolicies.User)]
    public async Task<ActionResult<ApiResponse<object?>>> Logout(CancellationToken cancellationToken)
    {
        var message = await _authService.LogoutAsync(HttpContext.AuthCaller(), cancellationToken);
        Response.DeleteAuthCookies(_auth);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    // Deletes the caller's own account and logs them out (the login cookies are cleared, as on logout).
    [HttpDelete("me")]
    [Authorize(Policy = AuthPolicies.User)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteAccount(CancellationToken cancellationToken)
    {
        var message = await _authService.DeleteAccountAsync(HttpContext.AuthCaller(), cancellationToken);
        Response.DeleteAuthCookies(_auth);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpPost("refresh")]
    [EnableRateLimiting(SecurityExtensions.AuthRefreshPolicy)]
    public async Task<ActionResult<ApiResponse<AuthResultDto>>> Refresh(CancellationToken cancellationToken)
    {
        var signIn = await _authService.RefreshAsync(Request.Cookies[_auth.RefreshCookie.Name], HttpContext.AuthCaller(), cancellationToken);
        Response.WriteAuthCookies(_auth, signIn);

        return Ok(ApiResponse<AuthResultDto>.SuccessResponse(signIn.Auth));
    }

    [HttpGet("quick-logins")]
    public async Task<ActionResult<ApiResponse<List<QuickLoginDto>>>> QuickLogins(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<List<QuickLoginDto>>.SuccessResponse(await _authService.GetQuickLoginsAsync(cancellationToken)));
    }

    [HttpPost("quick-logins/{userId:int}/login")]
    [EnableRateLimiting(SecurityExtensions.AuthLoginPolicy)]
    public async Task<ActionResult<ApiResponse<AuthResultDto>>> QuickLogin(int userId, CancellationToken cancellationToken)
    {
        var signIn = await _authService.QuickLoginAsync(userId, HttpContext.AuthCaller(), cancellationToken);
        Response.WriteAuthCookies(_auth, signIn);

        return Ok(ApiResponse<AuthResultDto>.SuccessResponse(signIn.Auth));
    }

    [HttpPost("login")]
    [EnableRateLimiting(SecurityExtensions.AuthLoginPolicy)]
    public async Task<ActionResult<ApiResponse<AuthResultDto>>> Login([FromBody] LoginRequestDto request, CancellationToken cancellationToken)
    {
        var signIn = await _authService.LoginAsync(request, HttpContext.AuthCaller(), cancellationToken);
        Response.WriteAuthCookies(_auth, signIn);

        return Ok(ApiResponse<AuthResultDto>.SuccessResponse(signIn.Auth));
    }

    [HttpPut("me")]
    [Authorize(Policy = AuthPolicies.User)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<UserDto>>> UpdateProfile([FromBody] ProfileUpdateDto request, CancellationToken cancellationToken)
    {
        var result = await _authService.UpdateProfileAsync(HttpContext.AuthCaller(), request, cancellationToken);

        return Ok(ApiResponse<UserDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPut("me/password")]
    [Authorize(Policy = AuthPolicies.User)]
    [EnableRateLimiting(SecurityExtensions.AuthLoginPolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> ChangePassword([FromBody] PasswordChangeDto request, CancellationToken cancellationToken)
    {
        var message = await _authService.ChangePasswordAsync(request, HttpContext.AuthCaller(), cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpPost("register")]
    [EnableRateLimiting(SecurityExtensions.AuthLoginPolicy)]
    public async Task<ActionResult<ApiResponse<AuthResultDto>>> Register([FromBody] RegisterRequestDto request, CancellationToken cancellationToken)
    {
        var signIn = await _authService.RegisterAsync(request, HttpContext.AuthCaller(), cancellationToken);
        Response.WriteAuthCookies(_auth, signIn);

        return Ok(ApiResponse<AuthResultDto>.SuccessResponse(signIn.Auth));
    }

    // The options of their own pages the user switches off for themselves (the My settings tab).
    [HttpPut("me/features")]
    [HasPermission(PageCodes.Account, PermissionActions.Edit)]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<UserDto>>> UpdateFeatures([FromBody] FeaturePreferencesDto request, CancellationToken cancellationToken)
    {
        var result = await _authService.UpdateFeaturesAsync(HttpContext.AuthCaller(), request, cancellationToken);

        return Ok(ApiResponse<UserDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
