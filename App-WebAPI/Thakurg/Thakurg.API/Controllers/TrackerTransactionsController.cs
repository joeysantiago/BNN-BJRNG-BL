using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Thakurg.API.Extensions;
using Thakurg.API.Filters;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Tracker;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.API.Controllers;

// SnapTracker's transactions of the caller: read a pasted or shared SMS or a batch of an SMS backup, add or edit one by hand, confirm / ignore / restore / not a duplicate, change the
// category (optionally for every later transaction of the merchant), mark what it counts towards ("Mark as…") and delete. Every answer carries the whole SnapTracker state.
[ApiController]
[Route("api/tracker")]
[Authorize(Policy = AuthPolicies.Tracker)]
[TypeFilter(typeof(TrackerProfileFilter))]
public class TrackerTransactionsController : ControllerBase
{
    private readonly ITrackerFlowService _flowService;

    private readonly ITrackerTransactionService _transactionService;

    public TrackerTransactionsController(ITrackerTransactionService transactionService, ITrackerFlowService flowService)
    {
        _transactionService = transactionService;
        _flowService = flowService;
    }

    #region Public Methods

    [HttpDelete("transactions/{id:int}")]
    public async Task<ActionResult<ApiResponse<TrackerDataDto>>> Remove(int id, CancellationToken cancellationToken)
    {
        return Result(await _transactionService.RemoveAsync(HttpContext.TrackerCaller(), id, cancellationToken));
    }

    // confirm, ignore, restore or not-duplicate.
    [HttpPost("transactions/{id:int}/{command}")]
    public async Task<ActionResult<ApiResponse<TrackerDataDto>>> Act(int id, string command, CancellationToken cancellationToken)
    {
        return Result(await _transactionService.ActAsync(HttpContext.TrackerCaller(), id, command, cancellationToken));
    }

    [HttpPost("transactions")]
    public async Task<ActionResult<ApiResponse<TrackerDataDto>>> Add([FromBody] TrackerTxnRequestDto request, CancellationToken cancellationToken)
    {
        return Result(await _transactionService.AddAsync(HttpContext.TrackerCaller(), request, cancellationToken));
    }

    [HttpPost("sms")]
    public async Task<ActionResult<ApiResponse<TrackerSmsReadDto>>> ReadSms([FromBody] TrackerSmsRequestDto request, CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<TrackerSmsReadDto>.SuccessResponse(await _transactionService.ReadSmsAsync(HttpContext.TrackerCaller(), request, cancellationToken)));
    }

    [HttpPut("transactions/{id:int}")]
    public async Task<ActionResult<ApiResponse<TrackerDataDto>>> Edit(int id, [FromBody] TrackerTxnRequestDto request, CancellationToken cancellationToken)
    {
        return Result(await _transactionService.EditAsync(HttpContext.TrackerCaller(), id, request, cancellationToken));
    }

    [HttpPut("transactions/{id:int}/flow")]
    public async Task<ActionResult<ApiResponse<TrackerDataDto>>> SetFlow(int id, [FromBody] TrackerFlowRequestDto request, CancellationToken cancellationToken)
    {
        return Result(await _flowService.SetFlowAsync(HttpContext.TrackerCaller(), id, request, cancellationToken));
    }

    [HttpPost("sms/import")]
    public async Task<ActionResult<ApiResponse<TrackerImportReadDto>>> ImportSms([FromBody] TrackerImportRequestDto request, CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<TrackerImportReadDto>.SuccessResponse(await _transactionService.ImportSmsAsync(HttpContext.TrackerCaller(), request, cancellationToken)));
    }

    [HttpPut("transactions/{id:int}/category")]
    public async Task<ActionResult<ApiResponse<TrackerDataDto>>> SetCategory(int id, [FromBody] TrackerCategoryRequestDto request, CancellationToken cancellationToken)
    {
        return Result(await _transactionService.SetCategoryAsync(HttpContext.TrackerCaller(), id, request, cancellationToken));
    }

    #endregion

    #region Private Methods

    private ActionResult<ApiResponse<TrackerDataDto>> Result(ServiceResultDto<TrackerDataDto> result)
    {
        return Ok(ApiResponse<TrackerDataDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
