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

    [HttpDelete("contacts/{contactId:int}")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(int contactId, CancellationToken cancellationToken)
    {
        var message = await _contactService.DeleteAsync(HttpContext.KhataCaller(), contactId, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpGet("books/{bookId:int}/contacts")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<ActionResult<ApiResponse<BookContactsDto>>> List(int bookId, CancellationToken cancellationToken)
    {
        var contacts = await _contactService.GetByBookAsync(HttpContext.KhataCaller(), bookId, cancellationToken);

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
