using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.Application.Services;
using Thakurg.Contracts.Settings;
using Thakurg.Contracts.Wrappers;

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

    [HttpGet("master-key")]
    public async Task<ActionResult<ApiResponse<MasterKeyStatusDto>>> MasterKeyStatus(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<MasterKeyStatusDto>.SuccessResponse(new MasterKeyStatusDto { IsSet = await _settingsService.IsMasterKeySetAsync(cancellationToken) }));
    }

    [HttpPost("master-key")]
    [EnableRateLimiting("sensitive")]
    public async Task<ActionResult<ApiResponse<bool>>> CreateMasterKey([FromBody] MasterKeyCreateDto request, CancellationToken cancellationToken)
    {
        var message = await _settingsService.CreateMasterKeyAsync(request.Password, request.Confirm, cancellationToken);

        return Ok(ApiResponse<bool>.SuccessResponse(true, message));
    }

    [HttpPost("unlock")]
    [EnableRateLimiting("sensitive")]
    public async Task<ActionResult<ApiResponse<bool>>> Unlock([FromHeader(Name = "X-Master-Key")] string? masterKey, CancellationToken cancellationToken)
    {
        await _settingsService.UnlockAsync(masterKey, cancellationToken);

        return Ok(ApiResponse<bool>.SuccessResponse(true));
    }

    [HttpPut]
    [EnableRateLimiting("sensitive")]
    public async Task<ActionResult<ApiResponse<AppSettingsDto>>> Save([FromBody] SettingsUpdateDto request, [FromHeader(Name = "X-Master-Key")] string? masterKey, CancellationToken cancellationToken)
    {
        var result = await _settingsService.SaveAsync(request, masterKey, cancellationToken);

        return Ok(ApiResponse<AppSettingsDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
