using Microsoft.Extensions.DependencyInjection;

namespace DatabaseInitializer.Seeding;

public static partial class SeederRegistration
{
    #region Private Methods

    static partial void AddTasksSeeder(IServiceCollection services)
    {
        services.AddSingleton<IDatabaseSeeder, TasksDatabaseSeeder>();
    }

    #endregion
}
