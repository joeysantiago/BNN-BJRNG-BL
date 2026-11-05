using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.WhatsApp;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// Settings > General > WhatsApp: the Meta WhatsApp Cloud API account every app sends WhatsApp messages with.
// Only a super admin who logged in with the password may see or change it, as for the mail server.
[ApiController]
[Route("api/admin/whatsapp")]
[Authorize(Policy = AuthPolicies.SuperAdminPassword)]
public class WhatsAppSettingsController : ControllerBase
{
    private readonly IWhatsAppSettingService _settingService;

    public WhatsAppSettingsController(IWhatsAppSettingService settingService)
    {
        _settingService = settingService;
    }

    #region Public Methods

    [HttpGet]
    public async Task<ActionResult<ApiResponse<WhatsAppSettingDto>>> Get(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<WhatsAppSettingDto>.SuccessResponse(await _settingService.GetAsync(cancellationToken)));
    }

    [HttpPost("test")]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Test([FromBody] WhatsAppTestRequestDto request, CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<object?>.SuccessResponse(null, await _settingService.TestAsync(request, cancellationToken)));
    }

    [HttpPut]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<WhatsAppSettingDto>>> Save([FromBody] WhatsAppSettingRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _settingService.SaveAsync(HttpContext.AuthCaller().UserId, request, cancellationToken);

        return Ok(ApiResponse<WhatsAppSettingDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
