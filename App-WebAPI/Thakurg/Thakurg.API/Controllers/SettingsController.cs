using Microsoft.AspNetCore.Mvc;
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

    #endregion
}
