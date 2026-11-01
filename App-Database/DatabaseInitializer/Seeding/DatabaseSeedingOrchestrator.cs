using DatabaseInitializer.Providers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DatabaseInitializer.Seeding;

public sealed class DatabaseSeedingOrchestrator : IDatabaseSeedingOrchestrator
{
    private readonly IConfiguration _configuration;

    private readonly IDatabaseProvisioner _provisioner;

    private readonly ISeederConfirmation _confirmation;

    private readonly IEnumerable<IDatabaseSeeder> _seeders;

    private readonly ILogger<DatabaseSeedingOrchestrator> _logger;

    public DatabaseSeedingOrchestrator(IConfiguration configuration, IDatabaseProvisioner provisioner, IEnumerable<IDatabaseSeeder> seeders, ISeederConfirmation confirmation, ILogger<DatabaseSeedingOrchestrator> logger)
    {
        _configuration = configuration;
        _provisioner = provisioner;
        _seeders = seeders;
        _confirmation = confirmation;
        _logger = logger;
    }

    #region Public Methods

    // Every app is asked first. All apps share one database, so it is prepared (drop prompt) only once, then the chosen apps run in registration order.
    public async Task RunAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Initializing databases on {Provider}", _provisioner.Name);

        var selected = SelectSeeders();
        if (selected.Count == 0)
        {
            _logger.LogInformation("No app was confirmed, nothing to do.");
            return;
        }

        var scriptsRootPath = Path.Combine(AppContext.BaseDirectory, "SqlScripts");
        var connectionString = _provisioner.GetConnectionString(_configuration);
        await _provisioner.EnsureDatabaseReadyAsync(connectionString, cancellationToken);

        foreach (var seeder in selected)
        {
            _logger.LogInformation("Running {App} SQL scripts on {DatabaseName}...", seeder.Database, seeder.DatabaseName);
            await seeder.RunAsync(connectionString, scriptsRootPath, cancellationToken);
        }

        _logger.LogInformation("Database initialization completed successfully.");
    }

    #endregion

    #region Private Methods

    private List<IDatabaseSeeder> SelectSeeders()
    {
        var selected = new List<IDatabaseSeeder>();

        foreach (var seeder in _seeders)
        {
            if (_confirmation.Confirm(seeder))
            {
                selected.Add(seeder);
            }
            else
            {
                _logger.LogInformation("Skipping {App} SQL scripts, not confirmed", seeder.Database);
            }
        }

        return selected;
    }

    #endregion
}
