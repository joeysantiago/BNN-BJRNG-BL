using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Thakurg.Application.Services;

namespace Thakurg.API.Controllers;

// The SnapKhata web-app manifest, open to everyone (the browser fetches it without a login). Its name comes from the database in the asked language (?lang=, else Accept-Language).
[ApiController]
[Route("api/khata")]
public class KhataManifestController : ControllerBase
{
    public const string CorsPolicy = "KhataManifestCors";

    private readonly IKhataManifestService _manifestService;

    private const string ContentType = "application/manifest+json";

    public KhataManifestController(IKhataManifestService manifestService)
    {
        _manifestService = manifestService;
    }

    #region Public Methods

    [HttpGet("manifest.webmanifest")]
    [EnableCors(CorsPolicy)]
    public async Task<IActionResult> Get([FromQuery] string? lang, CancellationToken cancellationToken)
    {
        var manifest = await _manifestService.BuildAsync(lang, cancellationToken);
        Response.Headers.CacheControl = "public, max-age=3600";
        Response.Headers.Vary = "Accept-Language";

        return new JsonResult(manifest) { ContentType = ContentType };
    }

    #endregion
}
