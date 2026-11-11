namespace DatabaseInitializer.Seeding;

public interface IDatabaseSeeder
{
    string Database { get; }

    Task RunAsync(string connectionString, string scriptsRootPath, CancellationToken cancellationToken);
}
