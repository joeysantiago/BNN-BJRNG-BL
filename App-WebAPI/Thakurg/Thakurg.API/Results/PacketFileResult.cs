using Microsoft.AspNetCore.Mvc;
using Thakurg.Contracts.Abstractions;

namespace Thakurg.API.Results;

public class PacketFileResult : IActionResult
{
    private readonly FileStreamDto _file;

    public PacketFileResult(FileStreamDto file)
    {
        _file = file;
    }

    #region Public Methods

    public async Task ExecuteResultAsync(ActionContext context)
    {
        var response = context.HttpContext.Response;
        response.ContentType = _file.ContentType;
        response.Headers.AcceptRanges = "bytes";

        if (_file.IsUnsatisfiable)
        {
            response.StatusCode = StatusCodes.Status416RangeNotSatisfiable;
            response.Headers.ContentRange = $"bytes */{_file.TotalLength}";

            return;
        }

        if (_file.IsPartial)
        {
            response.StatusCode = StatusCodes.Status206PartialContent;
            response.Headers.ContentRange = $"bytes {_file.RangeStart}-{_file.RangeEnd}/{_file.TotalLength}";
            response.ContentLength = _file.RangeEnd - _file.RangeStart + 1;
        }
        else if (_file.Content.CanSeek)
            response.ContentLength = _file.Content.Length;

        await using var content = _file.Content;
        await content.CopyToAsync(response.Body, context.HttpContext.RequestAborted);
    }

    #endregion
}
