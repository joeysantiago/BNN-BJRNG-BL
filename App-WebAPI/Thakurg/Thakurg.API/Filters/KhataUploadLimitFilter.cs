using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;
using Thakurg.Contracts.Configurations;

namespace Thakurg.API.Filters;

// Bill-photo uploads: the request body and the multipart form may hold Khata:Limits:MaxPhotosPerEntry photos of MaxPhotoBytes each,
// plus room for the multipart headers. Runs before model binding reads the form.
public class KhataUploadLimitFilter : IResourceFilter
{
    private readonly long _maxBytes;

    private const long MultipartOverheadBytes = 64 * 1024;

    public KhataUploadLimitFilter(IOptions<KhataOptions> options)
    {
        var limits = options.Value.Limits;
        _maxBytes = limits.MaxPhotosPerEntry * (limits.MaxPhotoBytes + MultipartOverheadBytes);
    }

    #region Public Methods

    public void OnResourceExecuted(ResourceExecutedContext context)
    {
    }

    public void OnResourceExecuting(ResourceExecutingContext context)
    {
        var httpContext = context.HttpContext;
        var sizeFeature = httpContext.Features.Get<IHttpMaxRequestBodySizeFeature>();
        if (sizeFeature is { IsReadOnly: false })
            sizeFeature.MaxRequestBodySize = _maxBytes;

        if (httpContext.Features.Get<IFormFeature>()?.Form is null)
            httpContext.Features.Set<IFormFeature>(new FormFeature(httpContext.Request, new FormOptions { MultipartBodyLengthLimit = _maxBytes }));
    }

    #endregion
}
