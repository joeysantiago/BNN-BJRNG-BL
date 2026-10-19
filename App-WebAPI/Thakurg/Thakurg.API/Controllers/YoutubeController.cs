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
    private readonly IYoutubeKeyService _keyService;

    private readonly IYoutubeService _youtubeService;

    public YoutubeController(IYoutubeService youtubeService, IYoutubeKeyService keyService)
    {
        _youtubeService = youtubeService;
        _keyService = keyService;
    }

    #region Public Methods

    [HttpGet("download-info")]
    public ActionResult<ApiResponse<YoutubeDownloadInfoDto>> DownloadInfo()
    {
        return Ok(ApiResponse<YoutubeDownloadInfoDto>.SuccessResponse(_youtubeService.GetDownloadInfo()));
    }

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
        var file = await _youtubeService.OpenDownloadAsync(videoId, cancellationToken);

        return File(file.Content, file.ContentType, file.FileName);
    }

    [HttpGet("key")]
    public async Task<ActionResult<ApiResponse<YoutubeKeyStatusDto>>> KeyStatus(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<YoutubeKeyStatusDto>.SuccessResponse(await _keyService.GetStatusAsync(cancellationToken)));
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

    [HttpPost("key")]
    [EnableRateLimiting("sensitive")]
    public async Task<ActionResult<ApiResponse<bool>>> SaveKey([FromBody] YoutubeKeyRequestDto request, [FromHeader(Name = "X-Master-Key")] string? masterKey, CancellationToken cancellationToken)
    {
        var message = await _keyService.SaveAsync(request.ApiKey, masterKey, cancellationToken);

        return Ok(ApiResponse<bool>.SuccessResponse(true, message));
    }

    #endregion
}
