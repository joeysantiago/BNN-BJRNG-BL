using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Thakurg.Application.Services;
using Thakurg.Contracts.Khata;

namespace Thakurg.Infrastructure.Security;

// A refused SnapKhata request is written to the Khata audit log. The limiter runs before the Khata profile is looked up, so the entry has no Khata user.
public class KhataRateLimitRejectionHandler : IRateLimitRejectionHandler
{
    #region Public Methods

    public async Task HandleAsync(HttpContext httpContext, CancellationToken cancellationToken)
    {
        if (!httpContext.Request.Path.StartsWithSegments("/api/khata"))
            return;

        var caller = new KhataCallerDto { Ip = httpContext.Connection.RemoteIpAddress?.ToString(), UserAgent = httpContext.Request.Headers.UserAgent.ToString() };
        await httpContext.RequestServices.GetRequiredService<IKhataAuditService>().WriteAsync(KhataAuditActions.RateLimited, null, caller, new { Path = httpContext.Request.Path.Value }, cancellationToken);
    }

    #endregion
}
