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

// The user's own SnapKhata settings and the per-party message choices.
[ApiController]
[Route("api/khata")]
[Authorize(Policy = AuthPolicies.Khata)]
[TypeFilter(typeof(KhataProfileFilter))]
public class KhataSettingsController : ControllerBase
{
    private readonly IKhataContactService _contactService;

    private readonly IKhataSettingsService _settingsService;

    public KhataSettingsController(IKhataSettingsService settingsService, IKhataContactService contactService)
    {
        _settingsService = settingsService;
        _contactService = contactService;
    }

    #region Public Methods

    [HttpGet("settings")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<ActionResult<ApiResponse<KhataSettingsDto>>> Get(CancellationToken cancellationToken)
    {
        var settings = await _settingsService.GetAsync(HttpContext.KhataCaller(), cancellationToken);

        return Ok(ApiResponse<KhataSettingsDto>.SuccessResponse(settings));
    }

    [HttpGet("contacts/{contactId:int}/notifications")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<ActionResult<ApiResponse<ContactNotifyDto>>> GetNotifications(int contactId, CancellationToken cancellationToken)
    {
        var notify = await _contactService.GetNotificationsAsync(HttpContext.KhataCaller(), contactId, cancellationToken);

        return Ok(ApiResponse<ContactNotifyDto>.SuccessResponse(notify));
    }

    [HttpPut("settings")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<KhataSettingsDto>>> Save([FromBody] KhataSettingsRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _settingsService.SaveAsync(HttpContext.KhataCaller(), request, cancellationToken);

        return Ok(ApiResponse<KhataSettingsDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPut("contacts/{contactId:int}/notifications")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<ContactNotifyDto>>> SaveNotifications(int contactId, [FromBody] ContactNotifyDto request, CancellationToken cancellationToken)
    {
        var result = await _contactService.SetNotificationsAsync(HttpContext.KhataCaller(), contactId, request, cancellationToken);

        return Ok(ApiResponse<ContactNotifyDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
