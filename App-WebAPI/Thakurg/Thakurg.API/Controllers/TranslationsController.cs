using Microsoft.AspNetCore.Mvc;
using Thakurg.Application.Services;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.API.Controllers;

[ApiController]
[Route("api/translations")]
public class TranslationsController : ControllerBase
{
    private readonly ITranslationService _translationService;

    public TranslationsController(ITranslationService translationService)
    {
        _translationService = translationService;
    }

    #region Public Methods

    [HttpGet("{language}")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
    public async Task<ActionResult<ApiResponse<Dictionary<string, string>>>> Get(string language, [FromQuery] string? pages, CancellationToken cancellationToken)
    {
        var texts = await _translationService.GetAsync(language, pages, cancellationToken);

        return Ok(ApiResponse<Dictionary<string, string>>.SuccessResponse(texts));
    }

    #endregion
}
