using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Results;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Music;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

[ApiController]
[Route("api/music")]
[Authorize(Policy = AuthPolicies.User)]
public class MusicController : ControllerBase
{
    private readonly IMusicService _musicService;

    public MusicController(IMusicService musicService)
    {
        _musicService = musicService;
    }

    #region Public Methods

    [HttpGet("{player}/tracks/{trackId:int}/cover")]
    public async Task<IActionResult> Cover(string player, int trackId, CancellationToken cancellationToken)
    {
        if (!User.HasApp(player))
            return Forbid();

        var file = await _musicService.OpenCoverAsync(player, trackId, cancellationToken);

        return File(file.Content, file.ContentType);
    }

    [HttpGet("{player}/tracks/{trackId:int}/audio")]
    public async Task<IActionResult> Audio(string player, int trackId, CancellationToken cancellationToken)
    {
        if (!User.HasApp(player))
            return Forbid();

        var file = await _musicService.OpenAudioAsync(player, trackId, Request.Headers.Range.ToString(), cancellationToken);

        return new PacketFileResult(file);
    }

    [HttpGet("{player}/tracks")]
    public async Task<ActionResult<ApiResponse<MusicTracksDto>>> List(string player, CancellationToken cancellationToken)
    {
        if (!User.HasApp(player))
            return Forbid();

        var tracks = await _musicService.ListAsync(player, cancellationToken);

        return Ok(ApiResponse<MusicTracksDto>.SuccessResponse(tracks));
    }

    // Makes the track list match the player's folder in the file store: new song files are added, rows whose file is gone are removed.
    [HttpPost("{player}/tracks/sync")]
    [EnableRateLimiting("sensitive")]
    public async Task<ActionResult<ApiResponse<MusicTracksDto>>> Sync(string player, CancellationToken cancellationToken)
    {
        if (!User.HasApp(player))
            return Forbid();

        var result = await _musicService.SyncAsync(player, cancellationToken);

        return Ok(ApiResponse<MusicTracksDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpDelete("{player}/tracks/{trackId:int}")]
    [EnableRateLimiting("sensitive")]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(string player, int trackId, CancellationToken cancellationToken)
    {
        if (!User.HasApp(player))
            return Forbid();

        var message = await _musicService.DeleteAsync(player, trackId, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpPost("{player}/tracks")]
    [EnableRateLimiting("sensitive")]
    [RequestSizeLimit(300_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 300_000_000)]
    public async Task<ActionResult<ApiResponse<MusicTracksDto>>> Upload(string player, [FromForm] List<IFormFile> files, CancellationToken cancellationToken)
    {
        if (!User.HasApp(player))
            return Forbid();

        var result = await _musicService.UploadAsync(player, files.Select(f => new UploadedFileDto { FileName = f.FileName, Content = f.OpenReadStream() }).ToList(), cancellationToken);

        return Ok(ApiResponse<MusicTracksDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
