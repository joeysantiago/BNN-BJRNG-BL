using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc.Filters;
using Thakurg.Application.Services;

namespace Thakurg.API.Filters;

// Lets a picture upload of My Tasks be as large as the limits of the AppSettings table allow (every picture at its largest), and no larger.
public class TasksUploadLimitFilter : IAsyncResourceFilter
{
    private const int PartOverhead = 64 * 1024;

    private readonly ITaskLimitsService _limits;

    public TasksUploadLimitFilter(ITaskLimitsService limits)
    {
        _limits = limits;
    }

    #region Public Methods

    public async Task OnResourceExecutionAsync(ResourceExecutingContext context, ResourceExecutionDelegate next)
    {
        var limits = await _limits.GetAsync(context.HttpContext.RequestAborted);
        var limit = limits.MaxPhotosPerTask * (limits.MaxPhotoBytes + PartOverhead);
        var bodySize = context.HttpContext.Features.Get<IHttpMaxRequestBodySizeFeature>();

        if (bodySize is { IsReadOnly: false })
            bodySize.MaxRequestBodySize = limit;

        context.HttpContext.Features.Set<IFormFeature>(new FormFeature(context.HttpContext.Request, new FormOptions { MultipartBodyLengthLimit = limit }));
        await next();
    }

    #endregion
}
