using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Application.Storage;
using Thakurg.Contracts.Configurations;
using Thakurg.Infrastructure.Repositories;
using Thakurg.Infrastructure.Services;
using Thakurg.Infrastructure.Storage;

namespace Thakurg.Infrastructure;

public static partial class DependencyInjection
{
    #region Private Methods

    static partial void AddMusicFeature(IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<MusicStorageOptions>().Bind(configuration.GetSection(MusicStorageOptions.SectionName)).Validate(o => o.CacheMinutes > 0, "MusicStorage:CacheMinutes must be above 0.").ValidateOnStart();

        services.AddSingleton<IMusicFileStore, MusicFileStore>();
        services.AddScoped<IMusicRepository, MusicRepository>();
        services.AddScoped<IMusicService, MusicService>();
    }

    #endregion
}
