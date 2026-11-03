using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Extensions;
using Thakurg.API.Filters;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// Bill photos of entries. The UI loads a photo with the Bearer token and shows it from a blob URL; photos are never public.
[ApiController]
[Route("api/khata")]
[Authorize(Policy = AuthPolicies.Khata)]
[TypeFilter(typeof(KhataProfileFilter))]
public class KhataAttachmentsController : ControllerBase
{
    private readonly IKhataAttachmentService _attachmentService;

    public KhataAttachmentsController(IKhataAttachmentService attachmentService)
    {
        _attachmentService = attachmentService;
    }

    #region Public Methods

    // A photo never changes once uploaded, so the browser may keep it for a day.
    [HttpGet("attachments/{attachmentId:int}")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<IActionResult> Get(int attachmentId, CancellationToken cancellationToken)
    {
        var file = await _attachmentService.OpenAsync(HttpContext.KhataCaller(), attachmentId, cancellationToken);
        Response.Headers.CacheControl = "private, max-age=86400";

        return File(file.Content, file.ContentType);
    }

    [HttpDelete("attachments/{attachmentId:int}")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(int attachmentId, CancellationToken cancellationToken)
    {
        var message = await _attachmentService.DeleteAsync(HttpContext.KhataCaller(), attachmentId, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    // multipart/form-data with one or more "files" fields; returns every photo the entry now has.
    [HttpPost("transactions/{transactionId:int}/attachments")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    [TypeFilter(typeof(KhataUploadLimitFilter))]
    public async Task<ActionResult<ApiResponse<List<AttachmentDto>>>> Upload(int transactionId, [FromForm] List<IFormFile> files, CancellationToken cancellationToken)
    {
        var photos = files.Select(f => new PhotoUploadDto { Content = f.OpenReadStream(), FileName = f.FileName, Length = f.Length }).ToList();

        try
        {
            var attachments = await _attachmentService.UploadAsync(HttpContext.KhataCaller(), transactionId, photos, cancellationToken);

            return Ok(ApiResponse<List<AttachmentDto>>.SuccessResponse(attachments));
        }
        finally
        {
            foreach (var photo in photos)
                await photo.Content.DisposeAsync();
        }
    }

    #endregion
}
