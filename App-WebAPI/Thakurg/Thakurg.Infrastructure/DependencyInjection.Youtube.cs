using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Infrastructure.Services;
using YoutubeExplode;

namespace Thakurg.Infrastructure;

public static partial class DependencyInjection
{
    #region Private Methods

    static partial void AddYoutubeFeature(IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<YoutubeOptions>(configuration.GetSection(YoutubeOptions.SectionName));

        services.AddSingleton<YoutubeClient>();
        services.AddHttpClient<IYoutubeDataApi, YoutubeDataApi>(client => client.Timeout = TimeSpan.FromSeconds(15));

        services.AddScoped<IYoutubeService, YoutubeService>();
        services.AddScoped<IYoutubeKeyService, YoutubeKeyService>();
    }

    #endregion
}
