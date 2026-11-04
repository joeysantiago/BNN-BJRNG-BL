using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;

namespace Thakurg.API.Controllers;

// The web-app manifest of each app that installs on its own (AppManifests in appsettings.json), open to everyone (the browser fetches it without a login).
// Its name comes from the database in the asked language (?lang=, else Accept-Language). An app this branch does not list answers 404.
[ApiController]
[Route("api/apps")]
public class AppManifestController : ControllerBase
{
    private readonly int _cacheSeconds;

    public const string CorsPolicy = "AppManifestCors";

    private readonly IAppManifestService _manifestService;

    private const string ContentType = "application/manifest+json";

    public AppManifestController(IAppManifestService manifestService, IOptions<AppManifestOptions> options)
    {
        _manifestService = manifestService;
        _cacheSeconds = options.Value.CacheSeconds;
    }

    #region Public Methods

    [HttpGet("{code}/manifest.webmanifest")]
    [EnableCors(CorsPolicy)]
    public async Task<IActionResult> Get(string code, [FromQuery] string? lang, CancellationToken cancellationToken)
    {
        var manifest = await _manifestService.BuildAsync(code, lang, cancellationToken);
        if (manifest is null)
            return NotFound();
        Response.Headers.CacheControl = "public, max-age=" + _cacheSeconds;
        Response.Headers.Vary = "Accept-Language";
        return new JsonResult(manifest) { ContentType = ContentType };
    }

    #endregion
}
