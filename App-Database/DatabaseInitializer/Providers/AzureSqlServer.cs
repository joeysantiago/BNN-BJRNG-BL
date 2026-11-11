using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DatabaseInitializer.Providers;

// Azure SQL Database: the database is created in the Azure portal (tier, size and free offer are chosen there), so it is never created or dropped here.
// A rebuild clears every table inside it instead, and the login only needs rights on that database, not on master.
public sealed class AzureSqlServer : IAzureSqlServer
{
    public string Name => "Azure SQL Server";

    private readonly ILogger<AzureSqlServer> _logger;

    private const string ConnectionStringKey = "AzureSQLConnection";

    // A paused serverless / free-offer database answers with one of these errors while it wakes up (or the login times out, -2), so opening the connection is retried.
    private static readonly SqlRetryLogicBaseProvider WakeUpRetry = SqlConfigurableRetryFactory.CreateExponentialRetryProvider(new SqlRetryLogicOption { NumberOfTries = 6, DeltaTime = TimeSpan.FromSeconds(5), MaxTimeInterval = TimeSpan.FromSeconds(60), TransientErrors = [-2, 40613, 40197, 40501, 49918, 49919, 49920, 10928, 10929, 4221] });

    // Foreign keys first, then the tables, so the order between tables does not matter.
    private const string ClearTablesSql = """
        DECLARE @sql NVARCHAR(MAX) = N'';
        SELECT @sql += N'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name) + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';' FROM sys.foreign_keys fk JOIN sys.tables t ON t.object_id = fk.parent_object_id;
        SELECT @sql += N'DROP TABLE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + N'.' + QUOTENAME(name) + N';' FROM sys.tables WHERE is_ms_shipped = 0;
        EXEC sp_executesql @sql;
        """;

    public AzureSqlServer(ILogger<AzureSqlServer> logger)
    {
        _logger = logger;
    }

    #region Public Methods

    public string GetConnectionString(IConfiguration configuration)
    {
        return configuration.GetConnectionString(ConnectionStringKey) ?? throw new InvalidOperationException($"{ConnectionStringKey} is not configured (required by the {Name} database provider).");
    }

    public async Task EnsureDatabaseReadyAsync(string connectionString, CancellationToken cancellationToken)
    {
        var databaseName = new SqlConnectionStringBuilder(connectionString).InitialCatalog;

        await using var connection = new SqlConnection(connectionString);
        connection.RetryLogicProvider = WakeUpRetry;
        await connection.OpenAsync(cancellationToken);

        if (await CountTablesAsync(connection, cancellationToken) == 0)
        {
            _logger.LogInformation("Database {Database} on {Provider} has no tables yet, creating them", databaseName, Name);
            return;
        }

        if (!ConfirmClear(databaseName))
        {
            _logger.LogInformation("Keeping the existing tables in {Database} on {Provider}, clearing was not confirmed", databaseName, Name);
            return;
        }

        _logger.LogWarning("Clearing every table in {Database} on {Provider} as confirmed by user", databaseName, Name);
        await ClearTablesAsync(connection, cancellationToken);
    }

    #endregion

    #region Private Methods

    private static bool ConfirmClear(string databaseName)
    {
        Console.Write($"Database '{databaseName}' already has tables. Drop every table and rebuild? [y/N]: ");
        var answer = Console.ReadLine()?.Trim();
        return string.Equals(answer, "y", StringComparison.OrdinalIgnoreCase) || string.Equals(answer, "yes", StringComparison.OrdinalIgnoreCase);
    }

    private static async Task ClearTablesAsync(SqlConnection connection, CancellationToken cancellationToken)
    {
        await using var clearCommand = connection.CreateCommand();
        clearCommand.CommandText = ClearTablesSql;
        await clearCommand.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<int> CountTablesAsync(SqlConnection connection, CancellationToken cancellationToken)
    {
        await using var countCommand = connection.CreateCommand();
        countCommand.CommandText = "SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped = 0";
        return (int)(await countCommand.ExecuteScalarAsync(cancellationToken) ?? 0);
    }

    #endregion
}
