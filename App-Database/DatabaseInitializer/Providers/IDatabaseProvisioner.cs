using Microsoft.Extensions.Configuration;

namespace DatabaseInitializer.Providers;

public interface IDatabaseProvisioner
{
    string Name { get; }

    string GetConnectionString(IConfiguration configuration);

    Task EnsureDatabaseReadyAsync(string connectionString, CancellationToken cancellationToken);
}
