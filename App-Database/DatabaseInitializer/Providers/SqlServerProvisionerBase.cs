using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DatabaseInitializer.Providers;

public abstract class SqlServerProvisionerBase : IDatabaseProvisioner
{
    private readonly ILogger _logger;

    public abstract string Name { get; }

    protected abstract string ConnectionStringKey { get; }

    protected SqlServerProvisionerBase(ILogger logger)
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
        var builder = new SqlConnectionStringBuilder(connectionString);
        var databaseName = builder.InitialCatalog;
        builder.InitialCatalog = "master";

        await using var connection = new SqlConnection(builder.ConnectionString);
        await connection.OpenAsync(cancellationToken);

        await using var existsCommand = connection.CreateCommand();
        existsCommand.CommandText = "SELECT DB_ID(@databaseName)";
        existsCommand.Parameters.AddWithValue("@databaseName", databaseName);
        var exists = await existsCommand.ExecuteScalarAsync(cancellationToken) is not DBNull;

        if (exists)
        {
            if (!ConfirmDrop(databaseName))
            {
                _logger.LogInformation("Keeping existing database {Database} on {Provider}, drop was not confirmed", databaseName, Name);
                return;
            }

            _logger.LogWarning("Dropping database {Database} on {Provider} as confirmed by user", databaseName, Name);
            await DropDatabaseAsync(connection, QuoteName(databaseName), cancellationToken);
        }

        _logger.LogInformation("Creating database {Database} on {Provider}", databaseName, Name);
        await CreateDatabaseAsync(connection, databaseName, cancellationToken);
    }

    #endregion

    #region Private Methods

    private static string QuoteName(string databaseName)
    {
        return databaseName.Replace("]", "]]");
    }

    private static bool ConfirmDrop(string databaseName)
    {
        Console.Write($"Database '{databaseName}' already exists. Drop and rebuild it? [y/N]: ");
        var answer = Console.ReadLine()?.Trim();
        return string.Equals(answer, "y", StringComparison.OrdinalIgnoreCase) || string.Equals(answer, "yes", StringComparison.OrdinalIgnoreCase);
    }

    private async Task CreateDatabaseAsync(SqlConnection connection, string databaseName, CancellationToken cancellationToken)
    {
        await using var createCommand = connection.CreateCommand();
        createCommand.CommandText = $"CREATE DATABASE [{QuoteName(databaseName)}]";
        await createCommand.ExecuteNonQueryAsync(cancellationToken);

        await WaitUntilOnlineAsync(connection, databaseName, cancellationToken);
    }

    protected abstract Task DropDatabaseAsync(SqlConnection connection, string quotedName, CancellationToken cancellationToken);

    protected virtual Task WaitUntilOnlineAsync(SqlConnection connection, string databaseName, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    #endregion
}
