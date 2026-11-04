using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Extensions;
using Thakurg.API.Filters;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// The app lock PIN of the installed SnapKhata app: its state, setting or changing it, locking the session when the app opens and checking the PIN.
// These work while the session is locked (KhataLockFree), except keep: it passes the lock like any ledger call and so keeps an open app unlocked.
[ApiController]
[Route("api/khata/pin")]
[Authorize(Policy = AuthPolicies.Khata)]
[TypeFilter(typeof(KhataProfileFilter))]
public class KhataPinController : ControllerBase
{
    private readonly IKhataPinService _pinService;

    public KhataPinController(IKhataPinService pinService)
    {
        _pinService = pinService;
    }

    #region Public Methods

    [HttpGet]
    [KhataLockFree]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<ActionResult<ApiResponse<KhataPinStatusDto>>> Get(CancellationToken cancellationToken)
    {
        var status = await _pinService.GetAsync(HttpContext.KhataCaller(), cancellationToken);

        return Ok(ApiResponse<KhataPinStatusDto>.SuccessResponse(status));
    }

    [HttpPost("keep")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<ActionResult<ApiResponse<KhataPinStatusDto>>> Keep(CancellationToken cancellationToken)
    {
        var status = await _pinService.GetAsync(HttpContext.KhataCaller(), cancellationToken);

        return Ok(ApiResponse<KhataPinStatusDto>.SuccessResponse(status));
    }

    [HttpPut]
    [KhataLockFree]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<KhataPinStatusDto>>> Set([FromBody] KhataPinRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _pinService.SetAsync(HttpContext.KhataCaller(), request, cancellationToken);

        return Ok(ApiResponse<KhataPinStatusDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPost("verify")]
    [KhataLockFree]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<KhataPinStatusDto>>> Verify([FromBody] KhataPinRequestDto request, CancellationToken cancellationToken)
    {
        var status = await _pinService.VerifyAsync(HttpContext.KhataCaller(), request, cancellationToken);

        return Ok(ApiResponse<KhataPinStatusDto>.SuccessResponse(status));
    }

    [HttpPost("lock")]
    [KhataLockFree]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<KhataPinStatusDto>>> Lock([FromBody] KhataPinLockRequestDto request, CancellationToken cancellationToken)
    {
        var status = await _pinService.LockAsync(HttpContext.KhataCaller(), request, cancellationToken);

        return Ok(ApiResponse<KhataPinStatusDto>.SuccessResponse(status));
    }

    #endregion
}
