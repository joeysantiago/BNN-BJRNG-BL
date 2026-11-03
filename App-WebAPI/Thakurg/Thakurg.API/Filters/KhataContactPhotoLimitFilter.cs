using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;
using Thakurg.Contracts.Configurations;

namespace Thakurg.API.Filters;

// Contact-picture uploads: the request body and the multipart form may hold one picture of Khata:Limits:MaxContactPhotoBytes plus MultipartOverheadBytes
// for the multipart headers. Runs before model binding reads the form.
public class KhataContactPhotoLimitFilter : IResourceFilter
{
    private readonly long _maxBytes;

    public KhataContactPhotoLimitFilter(IOptions<KhataOptions> options)
    {
        var limits = options.Value.Limits;
        _maxBytes = limits.MaxContactPhotoBytes + limits.MultipartOverheadBytes;
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
