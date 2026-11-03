using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Net.Http.Headers;
using Thakurg.API.Extensions;
using Thakurg.API.Filters;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Export;
using Thakurg.Contracts.Khata;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// Downloads (?format=pdf|csv|xlsx) of a book's entries, one party's statement and a book's parties. The entry lists take the same filters as the screens.
// The file comes as an attachment; its name is ASCII-safe in filename and complete (UTF-8) in filename*.
[ApiController]
[Route("api/khata")]
[Authorize(Policy = AuthPolicies.Khata)]
[TypeFilter(typeof(KhataProfileFilter))]
public class KhataExportController : ControllerBase
{
    private readonly IKhataExportService _exportService;

    public KhataExportController(IKhataExportService exportService)
    {
        _exportService = exportService;
    }

    #region Public Methods

    [HttpGet("books/{bookId:int}/contacts/export")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<IActionResult> Contacts(int bookId, [FromQuery] string? format, CancellationToken cancellationToken)
    {
        var file = await _exportService.ExportContactsAsync(HttpContext.KhataCaller(), bookId, format, cancellationToken);

        return Download(file);
    }

    [HttpGet("books/{bookId:int}/transactions/export")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<IActionResult> BookEntries(int bookId, [FromQuery] string? format, [FromQuery] TransactionQueryDto query, CancellationToken cancellationToken)
    {
        var file = await _exportService.ExportBookEntriesAsync(HttpContext.KhataCaller(), bookId, query, format, cancellationToken);

        return Download(file);
    }

    [HttpGet("contacts/{contactId:int}/transactions/export")]
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<IActionResult> ContactEntries(int contactId, [FromQuery] string? format, [FromQuery] TransactionQueryDto query, CancellationToken cancellationToken)
    {
        var file = await _exportService.ExportContactEntriesAsync(HttpContext.KhataCaller(), contactId, query, format, cancellationToken);

        return Download(file);
    }

    #endregion

    #region Private Methods

    // filename = only the ASCII letters, digits, dots and dashes of the name (statement-20261103.pdf); filename* = the whole name in UTF-8.
    private FileContentResult Download(ExportFileDto file)
    {
        var ascii = string.Join("-", new string(file.FileName.Select(c => char.IsAsciiLetterOrDigit(c) || c == '.' ? c : '-').ToArray()).Split('-', StringSplitOptions.RemoveEmptyEntries));
        Response.Headers.CacheControl = "no-store";
        Response.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment") { FileName = ascii, FileNameStar = file.FileName }.ToString();

        return File(file.Content, file.ContentType);
    }

    #endregion
}
