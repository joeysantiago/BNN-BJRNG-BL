using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Results;
using Thakurg.Application.Services;
using Thakurg.Contracts.Wrappers;
using Thakurg.Contracts.YouTube;

namespace Thakurg.API.Controllers;

[ApiController]
[Route("api/youtube")]
[EnableRateLimiting("stream")]
public class YoutubeController : ControllerBase
{
    private readonly IYoutubeService _youtubeService;

    public YoutubeController(IYoutubeService youtubeService)
    {
        _youtubeService = youtubeService;
    }

    #region Public Methods

    [HttpGet("stream/{videoId}")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Stream(string videoId, CancellationToken cancellationToken)
    {
        var file = await _youtubeService.OpenAudioAsync(videoId, Request.Headers.Range.ToString(), cancellationToken);

        return new PacketFileResult(file);
    }

    [HttpGet("download/{videoId}")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Download(string videoId, CancellationToken cancellationToken)
    {
        var file = await _youtubeService.OpenMp3Async(videoId, cancellationToken);

        return File(file.Content, file.ContentType, file.FileName);
    }

    [HttpGet("info/{videoId}")]
    public async Task<ActionResult<ApiResponse<YoutubeVideoDto>>> Info(string videoId, CancellationToken cancellationToken)
    {
        var video = await _youtubeService.GetVideoAsync(videoId, cancellationToken);

        return Ok(ApiResponse<YoutubeVideoDto>.SuccessResponse(video));
    }

    [HttpGet("playlist/{listId}")]
    public async Task<ActionResult<ApiResponse<List<YoutubeVideoDto>>>> Playlist(string listId, CancellationToken cancellationToken)
    {
        var videos = await _youtubeService.GetPlaylistAsync(listId, cancellationToken);

        return Ok(ApiResponse<List<YoutubeVideoDto>>.SuccessResponse(videos));
    }

    [HttpGet("search")]
    public async Task<ActionResult<ApiResponse<List<YoutubeVideoDto>>>> Search([FromQuery] string? q, CancellationToken cancellationToken)
    {
        var videos = await _youtubeService.SearchAsync(q, cancellationToken);

        return Ok(ApiResponse<List<YoutubeVideoDto>>.SuccessResponse(videos));
    }

    #endregion
}
