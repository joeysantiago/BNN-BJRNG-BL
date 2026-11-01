using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Infrastructure.Services;

namespace Thakurg.Infrastructure;

public static partial class DependencyInjection
{
    #region Private Methods

    static partial void AddSpeedTestFeature(IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<SpeedTestOptions>(configuration.GetSection(SpeedTestOptions.SectionName));

        services.AddScoped<ISpeedTestService, SpeedTestService>();
    }

    #endregion
}
