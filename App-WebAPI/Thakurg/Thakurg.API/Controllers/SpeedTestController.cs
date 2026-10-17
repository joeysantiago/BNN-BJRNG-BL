using Microsoft.AspNetCore.Mvc;
using Thakurg.Application.Services;
using Thakurg.Contracts.SpeedTest;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.API.Controllers;

[ApiController]
[Route("api/speedtest")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class SpeedTestController : ControllerBase
{
    private readonly ISpeedTestService _speedTestService;

    public SpeedTestController(ISpeedTestService speedTestService)
    {
        _speedTestService = speedTestService;
    }

    #region Public Methods

    [HttpGet("ping")]
    public IActionResult Ping()
    {
        return Ok();
    }

    [HttpGet("download")]
    public IActionResult Download([FromQuery] long bytes)
    {
        return File(_speedTestService.CreateDownload(bytes), "application/octet-stream");
    }

    [HttpPost("upload")]
    [RequestSizeLimit(16 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<long>>> Upload(CancellationToken cancellationToken)
    {
        var received = await _speedTestService.ReceiveUploadAsync(Request.Body, cancellationToken);

        return Ok(ApiResponse<long>.SuccessResponse(received));
    }

    [HttpGet("info")]
    public async Task<ActionResult<ApiResponse<SpeedTestInfoDto>>> Info(CancellationToken cancellationToken)
    {
        var info = await _speedTestService.GetInfoAsync(HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers["X-Forwarded-For"].ToString(), cancellationToken);

        return Ok(ApiResponse<SpeedTestInfoDto>.SuccessResponse(info));
    }

    #endregion
}
