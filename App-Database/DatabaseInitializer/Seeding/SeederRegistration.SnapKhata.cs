using Microsoft.Extensions.DependencyInjection;

namespace DatabaseInitializer.Seeding;

public static partial class SeederRegistration
{
    #region Private Methods

    static partial void AddSnapKhataSeeder(IServiceCollection services)
    {
        services.AddSingleton<IDatabaseSeeder, SnapKhataDatabaseSeeder>();
    }

    #endregion
}
