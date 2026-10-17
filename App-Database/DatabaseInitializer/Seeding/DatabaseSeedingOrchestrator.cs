using DatabaseInitializer.Providers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DatabaseInitializer.Seeding;

public sealed class DatabaseSeedingOrchestrator : IDatabaseSeedingOrchestrator
{
    private readonly IConfiguration _configuration;

    private readonly IDatabaseProvisioner _provisioner;

    private readonly IEnumerable<IDatabaseSeeder> _seeders;

    private readonly ILogger<DatabaseSeedingOrchestrator> _logger;

    public DatabaseSeedingOrchestrator(IConfiguration configuration, IDatabaseProvisioner provisioner, IEnumerable<IDatabaseSeeder> seeders, ILogger<DatabaseSeedingOrchestrator> logger)
    {
        _configuration = configuration;
        _provisioner = provisioner;
        _seeders = seeders;
        _logger = logger;
    }

    #region Public Methods

    // Seeders run in registration order.
    public async Task RunAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Initializing databases on {Provider}", _provisioner.Name);

        var scriptsRootPath = Path.Combine(AppContext.BaseDirectory, "SqlScripts");

        foreach (var seeder in _seeders)
        {
            var connectionString = _provisioner.GetConnectionString(_configuration);

            _logger.LogInformation("Running {DatabaseName} SQL scripts...", seeder.DatabaseName);
            await seeder.RunAsync(connectionString, scriptsRootPath, cancellationToken);
        }

        _logger.LogInformation("Database initialization completed successfully.");
    }

    #endregion
}
