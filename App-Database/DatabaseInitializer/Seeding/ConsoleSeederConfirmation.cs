using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DatabaseInitializer.Seeding;

// Asks on the console whether an app's scripts should run. "--Apps=Common,SnapKhata" or "--Apps=All" answers up front, without asking.
public sealed class ConsoleSeederConfirmation : ISeederConfirmation
{
    private readonly string? _apps;

    private const string AllApps = "All";

    private readonly ILogger<ConsoleSeederConfirmation> _logger;

    public ConsoleSeederConfirmation(IConfiguration configuration, ILogger<ConsoleSeederConfirmation> logger)
    {
        _apps = configuration["Apps"];
        _logger = logger;
    }

    #region Public Methods

    public bool Confirm(IDatabaseSeeder seeder)
    {
        if (!string.IsNullOrWhiteSpace(_apps))
            return IsListed(_apps, seeder.Database);

        if (Console.IsInputRedirected)
        {
            _logger.LogWarning("Skipping {App}: there is no console to ask. Pass --Apps with the app names, or --Apps=All", seeder.Database);
            return false;
        }

        Console.Write($"Create the {seeder.Database} app database objects in '{seeder.DatabaseName}'? [y/N]: ");
        var answer = Console.ReadLine()?.Trim();
        return string.Equals(answer, "y", StringComparison.OrdinalIgnoreCase) || string.Equals(answer, "yes", StringComparison.OrdinalIgnoreCase);
    }

    #endregion

    #region Private Methods

    private static bool IsListed(string apps, string app)
    {
        var names = apps.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return names.Any(name => string.Equals(name, AllApps, StringComparison.OrdinalIgnoreCase) || string.Equals(name, app, StringComparison.OrdinalIgnoreCase));
    }

    #endregion
}
