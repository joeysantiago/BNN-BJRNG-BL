using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;

namespace Thakurg.API.Controllers;

// The SnapKhata web-app manifest, open to everyone (the browser fetches it without a login). Its name comes from the database in the asked language (?lang=, else Accept-Language).
[ApiController]
[Route("api/khata")]
public class KhataManifestController : ControllerBase
{
    private readonly int _cacheSeconds;

    public const string CorsPolicy = "KhataManifestCors";

    private readonly IKhataManifestService _manifestService;

    private const string ContentType = "application/manifest+json";

    public KhataManifestController(IKhataManifestService manifestService, IOptions<KhataOptions> options)
    {
        _manifestService = manifestService;
        _cacheSeconds = options.Value.Manifest.CacheSeconds;
    }

    #region Public Methods

    [HttpGet("manifest.webmanifest")]
    [EnableCors(CorsPolicy)]
    public async Task<IActionResult> Get([FromQuery] string? lang, CancellationToken cancellationToken)
    {
        var manifest = await _manifestService.BuildAsync(lang, cancellationToken);
        Response.Headers.CacheControl = "public, max-age=" + _cacheSeconds;
        Response.Headers.Vary = "Accept-Language";

        return new JsonResult(manifest) { ContentType = ContentType };
    }

    #endregion
}
