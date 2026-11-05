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
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Infrastructure.Security;

public static partial class SecurityExtensions
{
    public const string StreamPolicy = "stream";

    public const string AuthOtpPolicy = "auth-otp";

    public const string SensitivePolicy = "sensitive";

    public const string AuthLoginPolicy = "auth-login";

    public const string AuthRefreshPolicy = "auth-refresh";

    #region Public Methods

    public static void UseThakurgProxy(this WebApplication app)
    {
        if (app.Services.GetRequiredService<IOptions<ProxyOptions>>().Value.Enabled)
            app.UseForwardedHeaders();
    }

    public static IServiceCollection AddThakurgProxy(this IServiceCollection services, IConfiguration configuration)
    {
        var proxy = configuration.GetSection(ProxyOptions.SectionName).Get<ProxyOptions>() ?? throw new InvalidOperationException($"{ProxyOptions.SectionName} is not configured in appsettings.json.");

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
        var limits = configuration.GetSection(RateLimitOptions.SectionName).Get<RateLimitOptions>() ?? throw new InvalidOperationException($"{RateLimitOptions.SectionName} is not configured in appsettings.json.");
        var window = TimeSpan.FromSeconds(limits.WindowSeconds);

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context => context.Request.Path.StartsWithSegments("/api/health") ? RateLimitPartition.GetNoLimiter("health") : RateLimitPartition.GetFixedWindowLimiter(ClientKey(context), _ => FixedWindow(limits.GlobalPermitLimit, window)));
            options.AddPolicy(StreamPolicy, context => RateLimitPartition.GetFixedWindowLimiter(ClientKey(context), _ => FixedWindow(limits.StreamPermitLimit, window)));
            options.AddPolicy(SensitivePolicy, context => RateLimitPartition.GetFixedWindowLimiter(ClientKey(context), _ => FixedWindow(limits.SensitivePermitLimit, window)));
            options.AddPolicy(AuthLoginPolicy, context => RateLimitPartition.GetSlidingWindowLimiter(ClientKey(context), _ => SlidingWindow(limits.Auth.Login)));
            options.AddPolicy(AuthOtpPolicy, context => RateLimitPartition.GetSlidingWindowLimiter(ClientKey(context), _ => SlidingWindow(limits.Auth.Otp)));
            options.AddPolicy(AuthRefreshPolicy, context => RateLimitPartition.GetFixedWindowLimiter(ClientKey(context), _ => FixedWindow(limits.Auth.Refresh.Permit, TimeSpan.FromSeconds(limits.Auth.Refresh.WindowSeconds))));
            AddKhataRateLimits(options, limits);
            options.OnRejected = async (context, cancellationToken) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                    context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();

                var message = await context.HttpContext.RequestServices.GetRequiredService<IMessageService>().GetAsync(MessageCodes.TooManyRequests);
                await context.HttpContext.Response.WriteAsJsonAsync(ApiResponse<object?>.FailureResponse(message), cancellationToken);

                foreach (var handler in context.HttpContext.RequestServices.GetServices<IRateLimitRejectionHandler>())
                    await handler.HandleAsync(context.HttpContext, cancellationToken);
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
        return context.User.FindFirst(AuthClaimTypes.Subject)?.Value is { } userId ? "user:" + userId : ClientKey(context);
    }

    // Steady rate of Permit per WindowSeconds (one token every WindowSeconds / Permit), with short bursts of up to Burst requests.
    private static TokenBucketRateLimiterOptions TokenBucket(RateLimitRule rule)
    {
        return new TokenBucketRateLimiterOptions { TokenLimit = rule.Burst, TokensPerPeriod = 1, ReplenishmentPeriod = TimeSpan.FromSeconds((double)rule.WindowSeconds / rule.Permit), AutoReplenishment = true };
    }

    private static SlidingWindowRateLimiterOptions SlidingWindow(RateLimitRule rule)
    {
        return new SlidingWindowRateLimiterOptions { PermitLimit = rule.Permit, Window = TimeSpan.FromSeconds(rule.WindowSeconds), SegmentsPerWindow = 10 };
    }

    private static FixedWindowRateLimiterOptions FixedWindow(int permitLimit, TimeSpan window)
    {
        return new FixedWindowRateLimiterOptions { PermitLimit = permitLimit, Window = window };
    }

    // Each feature adds its own limits in its own file (SecurityExtensions.<Feature>.cs). A branch without that file still builds: the call is dropped.
    static partial void AddKhataRateLimits(RateLimiterOptions options, RateLimitOptions limits);

    #endregion
}
