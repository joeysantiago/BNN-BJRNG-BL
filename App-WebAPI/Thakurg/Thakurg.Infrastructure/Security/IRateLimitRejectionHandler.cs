using Microsoft.AspNetCore.Http;

namespace Thakurg.Infrastructure.Security;

// Called after a request was refused by the rate limiter, so a feature can record it (SnapKhata writes an audit entry).
public interface IRateLimitRejectionHandler
{
    Task HandleAsync(HttpContext httpContext, CancellationToken cancellationToken);
}
