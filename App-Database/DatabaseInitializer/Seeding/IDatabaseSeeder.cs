namespace DatabaseInitializer.Seeding;

public interface IDatabaseSeeder
{
    string Database { get; }

    string DatabaseName { get; }

    Task RunAsync(string connectionString, string scriptsRootPath, CancellationToken cancellationToken);
}
