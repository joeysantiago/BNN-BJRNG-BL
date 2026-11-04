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

[ApiController]
[Route("api/khata")]
[Authorize(Policy = AuthPolicies.Khata)]
[TypeFilter(typeof(KhataProfileFilter))]
public class KhataContactsController : ControllerBase
{
    private readonly IKhataContactService _contactService;

    public KhataContactsController(IKhataContactService contactService)
    {
        _contactService = contactService;
    }

    #region Public Methods

    // The UI adds ?v={photo} so a new picture gets a new URL; the picture itself may be kept for a day.
    [HttpGet("contacts/{contactId:int}/photo")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<IActionResult> GetPhoto(int contactId, CancellationToken cancellationToken)
    {
        var file = await _contactService.OpenPhotoAsync(HttpContext.KhataCaller(), contactId, cancellationToken);
        Response.Headers.CacheControl = "private, max-age=86400";

        return File(file.Content, file.ContentType);
    }

    [HttpDelete("contacts/{contactId:int}")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(int contactId, CancellationToken cancellationToken)
    {
        var message = await _contactService.DeleteAsync(HttpContext.KhataCaller(), contactId, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    // A deleted contact comes back with its entries (they were never removed).
    [HttpPost("contacts/{contactId:int}/restore")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Restore(int contactId, CancellationToken cancellationToken)
    {
        var message = await _contactService.RestoreAsync(HttpContext.KhataCaller(), contactId, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpDelete("contacts/{contactId:int}/photo")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> DeletePhoto(int contactId, CancellationToken cancellationToken)
    {
        var message = await _contactService.DeletePhotoAsync(HttpContext.KhataCaller(), contactId, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    // multipart/form-data with one "file" field; replaces the previous picture.
    [HttpPut("contacts/{contactId:int}/photo")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    [TypeFilter(typeof(KhataContactPhotoLimitFilter))]
    public async Task<ActionResult<ApiResponse<ContactDto>>> SetPhoto(int contactId, IFormFile? file, CancellationToken cancellationToken)
    {
        await using var content = file?.OpenReadStream() ?? Stream.Null;
        var result = await _contactService.SetPhotoAsync(HttpContext.KhataCaller(), contactId, new PhotoUploadDto { Content = content, FileName = file?.FileName ?? string.Empty, Length = file?.Length ?? 0 }, cancellationToken);

        return Ok(ApiResponse<ContactDto>.SuccessResponse(result.Data, result.Message));
    }

    // ?includeDeleted=true adds the deleted contacts (IsDeleted = true) for the All and Deleted tabs.
    [HttpGet("books/{bookId:int}/contacts")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<ActionResult<ApiResponse<BookContactsDto>>> List(int bookId, [FromQuery] bool includeDeleted, CancellationToken cancellationToken)
    {
        var contacts = await _contactService.GetByBookAsync(HttpContext.KhataCaller(), bookId, includeDeleted, cancellationToken);

        return Ok(ApiResponse<BookContactsDto>.SuccessResponse(contacts));
    }

    [HttpPut("contacts/{contactId:int}")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<ContactDto>>> Update(int contactId, [FromBody] ContactRequestDto request, CancellationToken cancellationToken)
    {
        var contact = await _contactService.UpdateAsync(HttpContext.KhataCaller(), contactId, request, cancellationToken);

        return Ok(ApiResponse<ContactDto>.SuccessResponse(contact));
    }

    [HttpPut("contacts/{contactId:int}/permissions")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<ContactDto>>> SetPermission(int contactId, [FromBody] ContactPermissionRequestDto request, CancellationToken cancellationToken)
    {
        var contact = await _contactService.SetPermissionAsync(HttpContext.KhataCaller(), contactId, request, cancellationToken);

        return Ok(ApiResponse<ContactDto>.SuccessResponse(contact));
    }

    [HttpPost("books/{bookId:int}/contacts")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<ContactDto>>> Create(int bookId, [FromBody] ContactRequestDto request, [FromHeader(Name = KhataHeaders.IdempotencyKey)] Guid? idempotencyKey, CancellationToken cancellationToken)
    {
        var contact = await _contactService.CreateAsync(HttpContext.KhataCaller(), bookId, request, idempotencyKey, cancellationToken);

        return Ok(ApiResponse<ContactDto>.SuccessResponse(contact));
    }

    #endregion
}
