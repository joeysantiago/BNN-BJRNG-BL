using Microsoft.AspNetCore.Mvc;
using Thakurg.Application.Services;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.API.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly IHealthService _healthService;

    public HealthController(IHealthService healthService)
    {
        _healthService = healthService;
    }

    #region Public Methods

    [HttpGet]
    public ActionResult<ApiResponse<bool>> Get()
    {
        return Ok(ApiResponse<bool>.SuccessResponse(true));
    }

    // Called by the site as soon as it opens (and on Login), so a sleeping API and database wake while the visitor reads the page.
    [HttpGet("wake")]
    public async Task<ActionResult<ApiResponse<bool>>> Wake(CancellationToken cancellationToken)
    {
        var awake = await _healthService.WakeAsync(cancellationToken);

        return Ok(ApiResponse<bool>.SuccessResponse(awake));
    }

    #endregion
}
