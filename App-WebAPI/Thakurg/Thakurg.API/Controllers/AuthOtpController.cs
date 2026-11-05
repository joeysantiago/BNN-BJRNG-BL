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

// Login with a one-time code by e-mail or SMS, for the apps in Auth:Otp:Apps. Verify answers exactly like the password login (session and refresh cookies).
[ApiController]
[Route("api/auth/otp")]
public class AuthOtpController : ControllerBase
{
    private readonly AuthOptions _auth;

    private readonly IOtpService _otpService;

    public AuthOtpController(IOtpService otpService, IOptions<AuthOptions> options)
    {
        _otpService = otpService;
        _auth = options.Value;
    }

    #region Public Methods

    [HttpPost("request")]
    [EnableRateLimiting(SecurityExtensions.AuthOtpPolicy)]
    public async Task<ActionResult<ApiResponse<OtpRequestDto>>> RequestCode([FromBody] OtpCodeRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _otpService.RequestAsync(request, HttpContext.AuthCaller(), cancellationToken);

        return Ok(ApiResponse<OtpRequestDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPost("verify")]
    [EnableRateLimiting(SecurityExtensions.AuthOtpPolicy)]
    public async Task<ActionResult<ApiResponse<AuthResultDto>>> VerifyCode([FromBody] OtpVerifyRequestDto request, CancellationToken cancellationToken)
    {
        var signIn = await _otpService.VerifyAsync(request, HttpContext.AuthCaller(), cancellationToken);
        Response.WriteAuthCookies(_auth, signIn);

        return Ok(ApiResponse<AuthResultDto>.SuccessResponse(signIn.Auth));
    }

    #endregion
}
