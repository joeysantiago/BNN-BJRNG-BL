using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Mail;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// Settings > Mail: the mail servers that send the one-time codes and the notifications ({purpose} = otp or notification).
// Only a super admin who logged in with the password may see or change them, as for file storage.
[ApiController]
[Route("api/admin/mail")]
[Authorize(Policy = AuthPolicies.SuperAdminPassword)]
public class MailSettingsController : ControllerBase
{
    private readonly IMailSettingService _mailService;

    public MailSettingsController(IMailSettingService mailService)
    {
        _mailService = mailService;
    }

    #region Public Methods

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<MailSettingDto>>>> List(CancellationToken cancellationToken)
    {
        var settings = await _mailService.GetAllAsync(cancellationToken);

        return Ok(ApiResponse<List<MailSettingDto>>.SuccessResponse(settings));
    }

    // Sends a test e-mail through the saved profile to the caller's own address.
    [HttpPost("{purpose}/test")]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Test(string purpose, CancellationToken cancellationToken)
    {
        var message = await _mailService.TestAsync(HttpContext.AuthCaller().UserId, purpose, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpPut("{purpose}")]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<MailSettingDto>>> Save(string purpose, [FromBody] MailSettingRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _mailService.SaveAsync(HttpContext.AuthCaller().UserId, purpose, request, cancellationToken);

        return Ok(ApiResponse<MailSettingDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
