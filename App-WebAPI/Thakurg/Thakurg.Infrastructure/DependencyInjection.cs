using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Application.Storage;
using Thakurg.Contracts.Configurations;
using Thakurg.Infrastructure.Common;
using Thakurg.Infrastructure.Persistence;
using Thakurg.Infrastructure.Repositories;
using Thakurg.Infrastructure.Services;
using Thakurg.Infrastructure.Storage;
using YoutubeExplode;

namespace Thakurg.Infrastructure;

public static class DependencyInjection
{
    #region Public Methods

    public static IServiceCollection AddCommonDbContext(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<CommonDbContext>(options => options.UseSqlServer(connectionString));
        services.AddScoped<ICommonDbContext>(provider => provider.GetRequiredService<CommonDbContext>());

        return services;
    }

    public static IServiceCollection AddThakurgServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<HostingOptions>().Bind(configuration.GetSection(HostingOptions.SectionName)).Validate(o => o.HostedOn is HostingOptions.Local or HostingOptions.Azure, "Hosting:HostedOn must be Local or Azure.").ValidateOnStart();
        services.Configure<StreamingOptions>(configuration.GetSection(StreamingOptions.SectionName));
        services.Configure<SpeedTestOptions>(configuration.GetSection(SpeedTestOptions.SectionName));
        services.Configure<YoutubeOptions>(configuration.GetSection(YoutubeOptions.SectionName));
        services.Configure<MusicStorageOptions>(configuration.GetSection(MusicStorageOptions.SectionName));

        services.AddMemoryCache();
        services.AddHttpContextAccessor();
        services.AddSingleton<YoutubeClient>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<IMusicFileStore, MusicFileStore>();
        services.AddHttpClient<IYoutubeDataApi, YoutubeDataApi>(client => client.Timeout = TimeSpan.FromSeconds(15));

        services.AddScoped<IMusicRepository, MusicRepository>();
        services.AddScoped<IMessageRepository, MessageRepository>();
        services.AddScoped<ISettingsRepository, SettingsRepository>();
        services.AddScoped<ITranslationRepository, TranslationRepository>();

        services.AddScoped<IMusicService, MusicService>();
        services.AddScoped<IMessageService, MessageService>();
        services.AddScoped<IYoutubeService, YoutubeService>();
        services.AddScoped<ISettingsService, SettingsService>();
        services.AddScoped<ISpeedTestService, SpeedTestService>();
        services.AddScoped<IMasterKeyService, MasterKeyService>();
        services.AddScoped<IYoutubeKeyService, YoutubeKeyService>();
        services.AddScoped<IMusicAccessService, MusicAccessService>();
        services.AddScoped<ITranslationService, TranslationService>();

        return services;
    }

    #endregion
}
