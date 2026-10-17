using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Application.Storage;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Common;
using Thakurg.Infrastructure.Persistence;
using Thakurg.Infrastructure.Repositories;
using Thakurg.Infrastructure.Services;
using Thakurg.Infrastructure.Storage;
using YoutubeExplode;

namespace Thakurg.Infrastructure;

public static class DependencyInjection
{
    public const string SensitivePolicy = "sensitive";

    #region Public Methods

    public static IServiceCollection AddThakurgRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy(SensitivePolicy, context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
            options.OnRejected = async (context, cancellationToken) =>
            {
                var message = await context.HttpContext.RequestServices.GetRequiredService<IMessageService>().GetAsync(MessageCodes.TooManyRequests);
                await context.HttpContext.Response.WriteAsJsonAsync(ApiResponse<object?>.FailureResponse(message), cancellationToken);
            };
        });

        return services;
    }

    public static IServiceCollection AddCommonDbContext(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<CommonDbContext>(options => options.UseSqlServer(connectionString));
        services.AddScoped<ICommonDbContext>(provider => provider.GetRequiredService<CommonDbContext>());

        return services;
    }

    public static IServiceCollection AddThakurgServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<StreamingOptions>(configuration.GetSection(StreamingOptions.SectionName));
        services.Configure<SpeedTestOptions>(configuration.GetSection(SpeedTestOptions.SectionName));
        services.Configure<YoutubeOptions>(configuration.GetSection(YoutubeOptions.SectionName));
        services.Configure<MusicStorageOptions>(configuration.GetSection(MusicStorageOptions.SectionName));

        services.AddMemoryCache();
        services.AddHttpContextAccessor();
        services.AddSingleton<YoutubeClient>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<IMusicFileStore, MusicFileStore>();

        services.AddScoped<IMusicRepository, MusicRepository>();
        services.AddScoped<IMessageRepository, MessageRepository>();
        services.AddScoped<ISettingsRepository, SettingsRepository>();
        services.AddScoped<ITranslationRepository, TranslationRepository>();

        services.AddScoped<IMusicService, MusicService>();
        services.AddScoped<IMessageService, MessageService>();
        services.AddScoped<IYoutubeService, YoutubeService>();
        services.AddScoped<ISettingsService, SettingsService>();
        services.AddScoped<ISpeedTestService, SpeedTestService>();
        services.AddScoped<IMusicAccessService, MusicAccessService>();
        services.AddScoped<ITranslationService, TranslationService>();

        return services;
    }

    #endregion
}
