using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

[ApiController]
[Route("api/khata/auth")]
public class KhataAuthController : ControllerBase
{
    private readonly KhataCookieOptions _cookie;

    private readonly IKhataPinService _pinService;

    private readonly IKhataAuthService _authService;

    public KhataAuthController(IKhataAuthService authService, IKhataPinService pinService, IOptions<KhataOptions> options)
    {
        _authService = authService;
        _pinService = pinService;
        _cookie = options.Value.RefreshCookie;
    }

    #region Public Methods

    [HttpPost("logout")]
    [Authorize(Policy = KhataPolicies.Session)]
    public async Task<ActionResult<ApiResponse<object?>>> Logout(CancellationToken cancellationToken)
    {
        var message = await _authService.LogoutAsync(HttpContext.KhataCaller(), cancellationToken);
        Response.DeleteKhataRefreshCookie(_cookie);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpPost("renew")]
    [Authorize(Policy = KhataPolicies.Unlocked)]
    [EnableRateLimiting(SecurityExtensions.KhataRefreshPolicy)]
    public async Task<ActionResult<ApiResponse<KhataAuthResultDto>>> Renew(CancellationToken cancellationToken)
    {
        var result = await _authService.RenewAsync(HttpContext.KhataCaller(), cancellationToken);

        return Ok(ApiResponse<KhataAuthResultDto>.SuccessResponse(result));
    }

    [HttpPost("refresh")]
    [EnableRateLimiting(SecurityExtensions.KhataRefreshPolicy)]
    public async Task<ActionResult<ApiResponse<KhataAuthResultDto>>> Refresh(CancellationToken cancellationToken)
    {
        var signIn = await _authService.RefreshAsync(Request.Cookies[_cookie.Name], HttpContext.KhataCaller(), cancellationToken);
        Response.WriteKhataRefreshCookie(_cookie, signIn);

        return Ok(ApiResponse<KhataAuthResultDto>.SuccessResponse(signIn.Auth));
    }

    [HttpPost("pin")]
    [Authorize(Policy = KhataPolicies.Session)]
    [EnableRateLimiting(SecurityExtensions.KhataPinPolicy)]
    public async Task<ActionResult<ApiResponse<KhataAuthResultDto>>> SetPin([FromBody] PinRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _pinService.SetAsync(HttpContext.KhataCaller(), request.Pin, cancellationToken);

        return Ok(ApiResponse<KhataAuthResultDto>.SuccessResponse(result));
    }

    [HttpPost("otp/send")]
    [EnableRateLimiting(SecurityExtensions.KhataOtpSendPolicy)]
    public async Task<ActionResult<ApiResponse<OtpSendResultDto>>> SendOtp([FromBody] OtpSendRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _authService.SendOtpAsync(request, HttpContext.KhataCaller(), cancellationToken);

        return Ok(ApiResponse<OtpSendResultDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPost("pin/unlock")]
    [Authorize(Policy = KhataPolicies.Session)]
    [EnableRateLimiting(SecurityExtensions.KhataPinPolicy)]
    public async Task<ActionResult<ApiResponse<KhataAuthResultDto>>> UnlockPin([FromBody] PinRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _pinService.UnlockAsync(HttpContext.KhataCaller(), request.Pin, cancellationToken);

        return Ok(ApiResponse<KhataAuthResultDto>.SuccessResponse(result));
    }

    [HttpPost("pin/proof")]
    [Authorize(Policy = KhataPolicies.Unlocked)]
    [EnableRateLimiting(SecurityExtensions.KhataPinPolicy)]
    public async Task<ActionResult<ApiResponse<PinProofDto>>> CreatePinProof([FromBody] PinProofRequestDto request, CancellationToken cancellationToken)
    {
        var proof = await _pinService.CreateProofAsync(HttpContext.KhataCaller(), request, cancellationToken);

        return Ok(ApiResponse<PinProofDto>.SuccessResponse(proof));
    }

    [HttpPost("otp/verify")]
    [EnableRateLimiting(SecurityExtensions.KhataOtpVerifyPolicy)]
    public async Task<ActionResult<ApiResponse<KhataAuthResultDto>>> VerifyOtp([FromBody] OtpVerifyRequestDto request, CancellationToken cancellationToken)
    {
        var signIn = await _authService.VerifyOtpAsync(request, HttpContext.KhataCaller(), cancellationToken);
        Response.WriteKhataRefreshCookie(_cookie, signIn);

        return Ok(ApiResponse<KhataAuthResultDto>.SuccessResponse(signIn.Auth));
    }

    [HttpPut("pin")]
    [Authorize(Policy = KhataPolicies.Unlocked)]
    [EnableRateLimiting(SecurityExtensions.KhataPinPolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> ChangePin([FromBody] PinRequestDto request, [FromHeader(Name = KhataHeaders.PinProof)] string? proof, CancellationToken cancellationToken)
    {
        var message = await _pinService.ChangeAsync(HttpContext.KhataCaller(), request.Pin, proof, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    #endregion
}
