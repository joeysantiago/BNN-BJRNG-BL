using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// Profile pictures. Any logged-in user sees the pictures (the header, the Users tab); each user uploads or removes only their own.
// The browser loads a picture from its URL with the access cookie (GET only), so an <img> needs no Authorization header.
[ApiController]
[Route("api/auth/avatar")]
[Authorize(Policy = AuthPolicies.User)]
public class AvatarController : ControllerBase
{
    private readonly IAvatarService _avatarService;

    public AvatarController(IAvatarService avatarService)
    {
        _avatarService = avatarService;
    }

    #region Public Methods

    // The URL carries the file name (?v=), so the picture may be kept for a day: a new upload has a new URL.
    [HttpGet("{userId:int}")]
    public async Task<IActionResult> Get(int userId, CancellationToken cancellationToken)
    {
        var file = await _avatarService.OpenAsync(userId, cancellationToken);
        Response.Headers.CacheControl = "private, max-age=86400";

        return File(file.Content, file.ContentType);
    }

    [HttpDelete]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<UserDto>>> Remove(CancellationToken cancellationToken)
    {
        var result = await _avatarService.RemoveAsync(HttpContext.AuthCaller().UserId, cancellationToken);

        return Ok(ApiResponse<UserDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPut]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<UserDto>>> Upload(IFormFile file, CancellationToken cancellationToken)
    {
        await using var content = file.OpenReadStream();
        var result = await _avatarService.SaveAsync(HttpContext.AuthCaller().UserId, content, file.FileName, file.Length, cancellationToken);

        return Ok(ApiResponse<UserDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
