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
public class KhataTransactionsController : ControllerBase
{
    private readonly IKhataTransactionService _transactionService;

    public KhataTransactionsController(IKhataTransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    #region Public Methods

    [HttpDelete("transactions/{transactionId:int}")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(int transactionId, CancellationToken cancellationToken)
    {
        var message = await _transactionService.DeleteAsync(HttpContext.KhataCaller(), transactionId, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpGet("transactions/{transactionId:int}")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<ActionResult<ApiResponse<TransactionDetailDto>>> Detail(int transactionId, CancellationToken cancellationToken)
    {
        var detail = await _transactionService.GetDetailAsync(HttpContext.KhataCaller(), transactionId, cancellationToken);

        return Ok(ApiResponse<TransactionDetailDto>.SuccessResponse(detail));
    }

    [HttpGet("transactions/{transactionId:int}/history")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<ActionResult<ApiResponse<List<TransactionHistoryDto>>>> History(int transactionId, CancellationToken cancellationToken)
    {
        var history = await _transactionService.GetHistoryAsync(HttpContext.KhataCaller(), transactionId, cancellationToken);

        return Ok(ApiResponse<List<TransactionHistoryDto>>.SuccessResponse(history));
    }

    [HttpGet("contacts/{contactId:int}/transactions")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<ActionResult<ApiResponse<TransactionPageDto>>> List(int contactId, [FromQuery] TransactionQueryDto query, CancellationToken cancellationToken)
    {
        var result = await _transactionService.GetPageAsync(HttpContext.KhataCaller(), contactId, query, cancellationToken);

        return Ok(ApiResponse<TransactionPageDto>.SuccessResponse(result));
    }

    [HttpGet("books/{bookId:int}/transactions")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<ActionResult<ApiResponse<TransactionPageDto>>> BookList(int bookId, [FromQuery] TransactionQueryDto query, CancellationToken cancellationToken)
    {
        var result = await _transactionService.GetBookPageAsync(HttpContext.KhataCaller(), bookId, query, cancellationToken);

        return Ok(ApiResponse<TransactionPageDto>.SuccessResponse(result));
    }

    [HttpPut("transactions/{transactionId:int}")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<TransactionDto>>> Update(int transactionId, [FromBody] TransactionRequestDto request, CancellationToken cancellationToken)
    {
        var entry = await _transactionService.UpdateAsync(HttpContext.KhataCaller(), transactionId, request, cancellationToken);

        return Ok(ApiResponse<TransactionDto>.SuccessResponse(entry));
    }

    [HttpPost("contacts/{contactId:int}/transactions")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<TransactionDto>>> Add(int contactId, [FromBody] TransactionRequestDto request, [FromHeader(Name = KhataHeaders.IdempotencyKey)] Guid? idempotencyKey, CancellationToken cancellationToken)
    {
        var entry = await _transactionService.AddAsync(HttpContext.KhataCaller(), contactId, request, idempotencyKey, cancellationToken);

        return Ok(ApiResponse<TransactionDto>.SuccessResponse(entry));
    }

    #endregion
}
