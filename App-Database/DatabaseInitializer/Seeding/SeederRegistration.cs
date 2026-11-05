using Microsoft.Extensions.DependencyInjection;

namespace DatabaseInitializer.Seeding;

// One seeder per app folder in SqlScripts/CREATE and SqlScripts/INSERT. Registration order is the order the apps are asked about and run:
// Common first, then each app from its own file (SeederRegistration.<App>.cs). A branch without that file still builds: the call is dropped.
public static partial class SeederRegistration
{
    #region Public Methods

    public static IServiceCollection AddDatabaseSeeders(this IServiceCollection services)
    {
        services.AddSingleton<IDatabaseSeeder, CommonDatabaseSeeder>();
        AddMusicSeeder(services);
        AddSnapKhataSeeder(services);
        AddTasksSeeder(services);

        return services;
    }

    #endregion

    #region Private Methods

    static partial void AddMusicSeeder(IServiceCollection services);

    static partial void AddTasksSeeder(IServiceCollection services);

    static partial void AddSnapKhataSeeder(IServiceCollection services);

    #endregion
}
