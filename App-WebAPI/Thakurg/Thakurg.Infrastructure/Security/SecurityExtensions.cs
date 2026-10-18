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
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Infrastructure.Security;

public static class SecurityExtensions
{
    public const string StreamPolicy = "stream";

    public const string SensitivePolicy = "sensitive";

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
            options.OnRejected = async (context, cancellationToken) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                    context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();

                var message = await context.HttpContext.RequestServices.GetRequiredService<IMessageService>().GetAsync(MessageCodes.TooManyRequests);
                await context.HttpContext.Response.WriteAsJsonAsync(ApiResponse<object?>.FailureResponse(message), cancellationToken);
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

    private static FixedWindowRateLimiterOptions FixedWindow(int permitLimit, TimeSpan window)
    {
        return new FixedWindowRateLimiterOptions { PermitLimit = permitLimit, Window = window };
    }

    #endregion
}
