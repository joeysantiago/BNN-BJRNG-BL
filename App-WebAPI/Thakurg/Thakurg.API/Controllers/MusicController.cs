using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Results;
using Thakurg.Application.Services;
using Thakurg.Contracts.Music;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.API.Controllers;

[ApiController]
[Route("api/music")]
public class MusicController : ControllerBase
{
    private readonly IMusicService _musicService;

    private readonly IMusicAccessService _musicAccessService;

    public MusicController(IMusicService musicService, IMusicAccessService musicAccessService)
    {
        _musicService = musicService;
        _musicAccessService = musicAccessService;
    }

    #region Public Methods

    [HttpGet("{player}/tracks/{trackId:int}/cover")]
    public async Task<IActionResult> Cover(string player, int trackId, CancellationToken cancellationToken)
    {
        var file = await _musicService.OpenCoverAsync(player, trackId, cancellationToken);

        return File(file.Content, file.ContentType);
    }

    [HttpGet("{player}/tracks/{trackId:int}/audio")]
    public async Task<IActionResult> Audio(string player, int trackId, CancellationToken cancellationToken)
    {
        var file = await _musicService.OpenAudioAsync(player, trackId, Request.Headers.Range.ToString(), cancellationToken);

        return new PacketFileResult(file);
    }

    [HttpGet("{player}/tracks")]
    public async Task<ActionResult<ApiResponse<MusicTracksDto>>> List(string player, CancellationToken cancellationToken)
    {
        var tracks = await _musicService.ListAsync(player, cancellationToken);

        return Ok(ApiResponse<MusicTracksDto>.SuccessResponse(tracks));
    }

    [HttpDelete("{player}/tracks/{trackId:int}")]
    [EnableRateLimiting("sensitive")]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(string player, int trackId, [FromHeader(Name = "X-Edit-Password")] string? password, CancellationToken cancellationToken)
    {
        var message = await _musicService.DeleteAsync(player, trackId, password, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpPost("{player}/tracks")]
    [EnableRateLimiting("sensitive")]
    [RequestSizeLimit(300_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 300_000_000)]
    public async Task<ActionResult<ApiResponse<MusicTracksDto>>> Upload(string player, [FromForm] List<IFormFile> files, [FromHeader(Name = "X-Edit-Password")] string? password, CancellationToken cancellationToken)
    {
        var result = await _musicService.UploadAsync(player, password, files.Select(f => new UploadedFileDto { FileName = f.FileName, Content = f.OpenReadStream() }).ToList(), cancellationToken);

        return Ok(ApiResponse<MusicTracksDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPost("{player}/password/reset")]
    [EnableRateLimiting("sensitive")]
    public async Task<ActionResult<ApiResponse<object?>>> ResetPassword(string player, [FromBody] ChangePasswordRequestDto request, [FromHeader(Name = "X-Master-Key")] string? masterKey, CancellationToken cancellationToken)
    {
        var message = await _musicAccessService.ResetPasswordAsync(player, masterKey, request.NewPassword, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpPut("{player}/password")]
    [EnableRateLimiting("sensitive")]
    public async Task<ActionResult<ApiResponse<object?>>> ChangePassword(string player, [FromBody] ChangePasswordRequestDto request, [FromHeader(Name = "X-Edit-Password")] string? password, CancellationToken cancellationToken)
    {
        var message = await _musicAccessService.ChangePasswordAsync(player, password, request.NewPassword, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    #endregion
}
