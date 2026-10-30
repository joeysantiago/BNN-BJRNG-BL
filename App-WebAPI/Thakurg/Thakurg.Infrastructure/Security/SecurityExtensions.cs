using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Infrastructure.Security;

public static class SecurityExtensions
{
    public const string StreamPolicy = "stream";

    public const string KhataPinPolicy = "khata-pin";

    public const string SensitivePolicy = "sensitive";

    public const string KhataRefreshPolicy = "khata-refresh";

    public const string KhataOtpSendPolicy = "khata-otp-send";

    public const string KhataOtpVerifyPolicy = "khata-otp-verify";

    #region Public Methods

    public static void UseThakurgProxy(this WebApplication app)
    {
        if (app.Services.GetRequiredService<IOptions<ProxyOptions>>().Value.Enabled)
            app.UseForwardedHeaders();
    }

    public static IServiceCollection AddThakurgProxy(this IServiceCollection services, IConfiguration configuration)
    {
        var proxy = configuration.GetSection(ProxyOptions.SectionName).Get<ProxyOptions>() ?? new ProxyOptions();

        services.Configure<ProxyOptions>(configuration.GetSection(ProxyOptions.SectionName));
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.ForwardLimit = proxy.ForwardLimit;

            if (proxy.KnownProxies.Length == 0 && proxy.KnownNetworks.Length == 0)
                return;

            options.KnownProxies.Clear();
            options.KnownIPNetworks.Clear();

            foreach (var address in proxy.KnownProxies)
                options.KnownProxies.Add(IPAddress.Parse(address));

            foreach (var network in proxy.KnownNetworks)
                options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(network));
        });

        return services;
    }

    public static IServiceCollection AddThakurgRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        var limits = configuration.GetSection(RateLimitOptions.SectionName).Get<RateLimitOptions>() ?? new RateLimitOptions();
        var window = TimeSpan.FromSeconds(limits.WindowSeconds);

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context => context.Request.Path.StartsWithSegments("/api/health") ? RateLimitPartition.GetNoLimiter("health") : RateLimitPartition.GetFixedWindowLimiter(ClientKey(context), _ => FixedWindow(limits.GlobalPermitLimit, window)));
            options.AddPolicy(StreamPolicy, context => RateLimitPartition.GetFixedWindowLimiter(ClientKey(context), _ => FixedWindow(limits.StreamPermitLimit, window)));
            options.AddPolicy(SensitivePolicy, context => RateLimitPartition.GetFixedWindowLimiter(ClientKey(context), _ => FixedWindow(limits.SensitivePermitLimit, window)));
            options.AddPolicy(KhataOtpSendPolicy, context => RateLimitPartition.GetSlidingWindowLimiter(ClientKey(context), _ => SlidingWindow(limits.Khata.OtpSend)));
            options.AddPolicy(KhataOtpVerifyPolicy, context => RateLimitPartition.GetSlidingWindowLimiter(ClientKey(context), _ => SlidingWindow(limits.Khata.OtpVerify)));
            options.AddPolicy(KhataRefreshPolicy, context => RateLimitPartition.GetFixedWindowLimiter(ClientKey(context), _ => FixedWindow(limits.Khata.Refresh.Permit, TimeSpan.FromSeconds(limits.Khata.Refresh.WindowSeconds))));
            options.AddPolicy(KhataPinPolicy, context => RateLimitPartition.GetFixedWindowLimiter(UserOrClientKey(context), _ => FixedWindow(limits.Khata.Pin.Permit, TimeSpan.FromSeconds(limits.Khata.Pin.WindowSeconds))));
            options.OnRejected = async (context, cancellationToken) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                    context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();

                var message = await context.HttpContext.RequestServices.GetRequiredService<IMessageService>().GetAsync(MessageCodes.TooManyRequests);
                await context.HttpContext.Response.WriteAsJsonAsync(ApiResponse<object?>.FailureResponse(message), cancellationToken);

                if (context.HttpContext.Request.Path.StartsWithSegments("/api/khata"))
                    await AuditRejectionAsync(context.HttpContext, cancellationToken);
            };
        });

        return services;
    }

    #endregion

    #region Private Methods

    private static string ClientKey(HttpContext context)
    {
        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    // Logged-in requests are limited per user, so several local test users on the same ::1 address don't share one limit.
    private static string UserOrClientKey(HttpContext context)
    {
        return context.User.FindFirst(KhataClaimTypes.Subject)?.Value is { } userId ? "user:" + userId : ClientKey(context);
    }

    private static SlidingWindowRateLimiterOptions SlidingWindow(RateLimitRule rule)
    {
        return new SlidingWindowRateLimiterOptions { PermitLimit = rule.Permit, Window = TimeSpan.FromSeconds(rule.WindowSeconds), SegmentsPerWindow = 10 };
    }

    private static FixedWindowRateLimiterOptions FixedWindow(int permitLimit, TimeSpan window)
    {
        return new FixedWindowRateLimiterOptions { PermitLimit = permitLimit, Window = window };
    }

    private static async Task AuditRejectionAsync(HttpContext httpContext, CancellationToken cancellationToken)
    {
        var userId = int.TryParse(httpContext.User.FindFirst(KhataClaimTypes.Subject)?.Value, out var id) ? id : (int?)null;
        var caller = new KhataCallerDto { Ip = httpContext.Connection.RemoteIpAddress?.ToString(), UserAgent = httpContext.Request.Headers.UserAgent.ToString() };
        await httpContext.RequestServices.GetRequiredService<IKhataAuditService>().WriteAsync(KhataAuditActions.RateLimited, userId, caller, new { Path = httpContext.Request.Path.Value }, cancellationToken);
    }

    #endregion
}
