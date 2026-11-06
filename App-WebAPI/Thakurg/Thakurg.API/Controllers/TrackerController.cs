using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Thakurg.API.Extensions;
using Thakurg.API.Filters;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Tracker;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.API.Controllers;

// SnapTracker of the caller: everything the app shows, the settings (Settings > General > SnapTracker), SMS reading on the phone, the alerts and the
// user's data (Profile > SnapTracker: download, delete the SMS texts, delete everything).
[ApiController]
[Route("api/tracker")]
[Authorize(Policy = AuthPolicies.Tracker)]
[TypeFilter(typeof(TrackerProfileFilter))]
public class TrackerController : ControllerBase
{
    private readonly ITrackerService _trackerService;

    public TrackerController(ITrackerService trackerService)
    {
        _trackerService = trackerService;
    }

    #region Public Methods

    [HttpGet("state")]
    public async Task<ActionResult<ApiResponse<TrackerDataDto>>> State(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<TrackerDataDto>.SuccessResponse(await _trackerService.GetStateAsync(HttpContext.TrackerCaller(), cancellationToken)));
    }

    [HttpGet("export")]
    public async Task<ActionResult<ApiResponse<TrackerDataDto>>> Export(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<TrackerDataDto>.SuccessResponse(await _trackerService.ExportAsync(HttpContext.TrackerCaller(), cancellationToken)));
    }

    [HttpDelete("me")]
    public async Task<ActionResult<ApiResponse<TrackerDataDto>>> DeleteAll(CancellationToken cancellationToken)
    {
        return Result(await _trackerService.DeleteAllAsync(HttpContext.TrackerCaller(), cancellationToken));
    }

    [HttpPost("alerts/read")]
    public async Task<ActionResult<ApiResponse<TrackerDataDto>>> ReadAlerts(CancellationToken cancellationToken)
    {
        return Result(await _trackerService.ReadAlertsAsync(HttpContext.TrackerCaller(), cancellationToken));
    }

    [HttpDelete("sms-texts")]
    public async Task<ActionResult<ApiResponse<TrackerDataDto>>> DeleteSmsTexts(CancellationToken cancellationToken)
    {
        return Result(await _trackerService.DeleteSmsTextsAsync(HttpContext.TrackerCaller(), cancellationToken));
    }

    // enable, pause, resume or revoke.
    [HttpPost("tracking/{command}")]
    public async Task<ActionResult<ApiResponse<TrackerDataDto>>> Tracking(string command, CancellationToken cancellationToken)
    {
        return Result(await _trackerService.TrackingAsync(HttpContext.TrackerCaller(), command, cancellationToken));
    }

    [HttpPut("settings")]
    public async Task<ActionResult<ApiResponse<TrackerDataDto>>> SaveSettings([FromBody] TrackerSettingsDto request, CancellationToken cancellationToken)
    {
        return Result(await _trackerService.SaveSettingsAsync(HttpContext.TrackerCaller(), request, cancellationToken));
    }

    #endregion

    #region Private Methods

    private ActionResult<ApiResponse<TrackerDataDto>> Result(ServiceResultDto<TrackerDataDto> result)
    {
        return Ok(ApiResponse<TrackerDataDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
