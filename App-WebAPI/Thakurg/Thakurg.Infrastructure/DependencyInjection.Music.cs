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
        services.Configure<MusicStorageOptions>(configuration.GetSection(MusicStorageOptions.SectionName));

        services.AddSingleton<IMusicFileStore, MusicFileStore>();
        services.AddScoped<IMusicRepository, MusicRepository>();
        services.AddScoped<IMusicService, MusicService>();
    }

    #endregion
}
