using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

[ApiController]
[Route("api/khata/books")]
[Authorize(Policy = KhataPolicies.Unlocked)]
public class KhataBooksController : ControllerBase
{
    private readonly IKhataBookService _bookService;

    public KhataBooksController(IKhataBookService bookService)
    {
        _bookService = bookService;
    }

    #region Public Methods

    [HttpGet]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<ActionResult<ApiResponse<List<BookDto>>>> List(CancellationToken cancellationToken)
    {
        var books = await _bookService.GetAllAsync(HttpContext.KhataCaller(), cancellationToken);

        return Ok(ApiResponse<List<BookDto>>.SuccessResponse(books));
    }

    [HttpPut("{bookId:int}/open")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<BookDto>>> Open(int bookId, CancellationToken cancellationToken)
    {
        var book = await _bookService.OpenAsync(HttpContext.KhataCaller(), bookId, cancellationToken);

        return Ok(ApiResponse<BookDto>.SuccessResponse(book));
    }

    [HttpPut("{bookId:int}")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<BookDto>>> Update(int bookId, [FromBody] BookRequestDto request, CancellationToken cancellationToken)
    {
        var book = await _bookService.UpdateAsync(HttpContext.KhataCaller(), bookId, request, cancellationToken);

        return Ok(ApiResponse<BookDto>.SuccessResponse(book));
    }

    [HttpDelete("{bookId:int}")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(int bookId, [FromHeader(Name = KhataHeaders.PinProof)] string? proof, CancellationToken cancellationToken)
    {
        var message = await _bookService.DeleteAsync(HttpContext.KhataCaller(), bookId, proof, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpPost]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<BookDto>>> Create([FromBody] BookRequestDto request, [FromHeader(Name = KhataHeaders.IdempotencyKey)] Guid? idempotencyKey, CancellationToken cancellationToken)
    {
        var book = await _bookService.CreateAsync(HttpContext.KhataCaller(), request, idempotencyKey, cancellationToken);

        return Ok(ApiResponse<BookDto>.SuccessResponse(book));
    }

    #endregion
}
