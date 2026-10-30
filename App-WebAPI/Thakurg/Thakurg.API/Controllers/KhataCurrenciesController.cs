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
[Route("api/khata/currencies")]
[Authorize(Policy = KhataPolicies.Unlocked)]
public class KhataCurrenciesController : ControllerBase
{
    private readonly IKhataCurrencyService _currencyService;

    public KhataCurrenciesController(IKhataCurrencyService currencyService)
    {
        _currencyService = currencyService;
    }

    #region Public Methods

    [HttpGet]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<ActionResult<ApiResponse<List<CurrencyDto>>>> List(CancellationToken cancellationToken)
    {
        var currencies = await _currencyService.GetAllAsync(HttpContext.KhataCaller(), cancellationToken);

        return Ok(ApiResponse<List<CurrencyDto>>.SuccessResponse(currencies));
    }

    [HttpDelete("{currencyId:int}")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(int currencyId, CancellationToken cancellationToken)
    {
        var message = await _currencyService.DeleteAsync(HttpContext.KhataCaller(), currencyId, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpPost]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<CurrencyDto>>> Add([FromBody] CurrencyRequestDto request, CancellationToken cancellationToken)
    {
        var currency = await _currencyService.AddAsync(HttpContext.KhataCaller(), request, cancellationToken);

        return Ok(ApiResponse<CurrencyDto>.SuccessResponse(currency));
    }

    [HttpPut("{currencyId:int}")]
    [EnableRateLimiting(SecurityExtensions.KhataWritePolicy)]
    public async Task<ActionResult<ApiResponse<CurrencyDto>>> Update(int currencyId, [FromBody] CurrencyRequestDto request, CancellationToken cancellationToken)
    {
        var currency = await _currencyService.UpdateAsync(HttpContext.KhataCaller(), currencyId, request, cancellationToken);

        return Ok(ApiResponse<CurrencyDto>.SuccessResponse(currency));
    }

    #endregion
}
