using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Lookups;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.API.Controllers;

// The address dropdowns of the Profile page, for a logged-in user: countries, then the states of the chosen country, then the cities of the chosen state.
[ApiController]
[Route("api/lookups")]
[Authorize(Policy = AuthPolicies.User)]
public class LookupsController : ControllerBase
{
    private readonly ILookupService _lookupService;

    public LookupsController(ILookupService lookupService)
    {
        _lookupService = lookupService;
    }

    #region Public Methods

    [HttpGet("countries")]
    public async Task<ActionResult<ApiResponse<List<LookupItemDto>>>> Countries(CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<List<LookupItemDto>>.SuccessResponse(await _lookupService.GetCountriesAsync(cancellationToken)));
    }

    [HttpGet("states/{stateId:int}/cities")]
    public async Task<ActionResult<ApiResponse<List<LookupItemDto>>>> Cities(int stateId, CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<List<LookupItemDto>>.SuccessResponse(await _lookupService.GetCitiesAsync(stateId, cancellationToken)));
    }

    [HttpGet("countries/{countryId:int}/states")]
    public async Task<ActionResult<ApiResponse<List<LookupItemDto>>>> States(int countryId, CancellationToken cancellationToken)
    {
        return Ok(ApiResponse<List<LookupItemDto>>.SuccessResponse(await _lookupService.GetStatesAsync(countryId, cancellationToken)));
    }

    #endregion
}
