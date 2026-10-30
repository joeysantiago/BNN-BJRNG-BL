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
[Route("api/khata")]
[Authorize(Policy = KhataPolicies.Unlocked)]
public class KhataTransactionsController : ControllerBase
{
    private readonly IKhataTransactionService _transactionService;

    public KhataTransactionsController(IKhataTransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    #region Public Methods

    [HttpGet("transactions/{transactionId:int}/history")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<ActionResult<ApiResponse<List<TransactionHistoryDto>>>> History(int transactionId, CancellationToken cancellationToken)
    {
        var history = await _transactionService.GetHistoryAsync(HttpContext.KhataCaller(), transactionId, cancellationToken);

        return Ok(ApiResponse<List<TransactionHistoryDto>>.SuccessResponse(history));
    }

    [HttpGet("contacts/{contactId:int}/transactions")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<ActionResult<ApiResponse<TransactionPageDto>>> List(int contactId, [FromQuery] int page, [FromQuery] int? pageSize, CancellationToken cancellationToken)
    {
        var result = await _transactionService.GetPageAsync(HttpContext.KhataCaller(), contactId, page, pageSize, cancellationToken);

        return Ok(ApiResponse<TransactionPageDto>.SuccessResponse(result));
    }

    [HttpDelete("transactions/{transactionId:int}")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(int transactionId, [FromHeader(Name = KhataHeaders.PinProof)] string? proof, CancellationToken cancellationToken)
    {
        var message = await _transactionService.DeleteAsync(HttpContext.KhataCaller(), transactionId, proof, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpPut("transactions/{transactionId:int}")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<TransactionDto>>> Update(int transactionId, [FromBody] TransactionRequestDto request, [FromHeader(Name = KhataHeaders.PinProof)] string? proof, CancellationToken cancellationToken)
    {
        var entry = await _transactionService.UpdateAsync(HttpContext.KhataCaller(), transactionId, request, proof, cancellationToken);

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
