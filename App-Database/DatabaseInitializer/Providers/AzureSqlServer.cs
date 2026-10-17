using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;

namespace DatabaseInitializer.Providers;

public sealed class AzureSqlServer : SqlServerProvisionerBase, IAzureSqlServer
{
    public override string Name => "Azure SQL Server";

    protected override string ConnectionStringKey => "AzureSQLConnection";

    private static readonly TimeSpan OnlineTimeout = TimeSpan.FromMinutes(5);

    private static readonly TimeSpan OnlinePollInterval = TimeSpan.FromSeconds(2);

    public AzureSqlServer(ILogger<AzureSqlServer> logger) : base(logger)
    {
    }

    #region Private Methods

    // Azure SQL Database does not support SINGLE_USER; DROP DATABASE terminates open sessions itself.
    protected override async Task DropDatabaseAsync(SqlConnection connection, string quotedName, CancellationToken cancellationToken)
    {
        await using var dropCommand = connection.CreateCommand();
        dropCommand.CommandText = $"DROP DATABASE [{quotedName}]";
        await dropCommand.ExecuteNonQueryAsync(cancellationToken);
    }

    // CREATE DATABASE can return before the database is usable on Azure, so wait until it reports ONLINE.
    protected override async Task WaitUntilOnlineAsync(SqlConnection connection, string databaseName, CancellationToken cancellationToken)
    {
        var deadline = DateTime.UtcNow + OnlineTimeout;

        while (DateTime.UtcNow < deadline)
        {
            await using var stateCommand = connection.CreateCommand();
            stateCommand.CommandText = "SELECT state_desc FROM sys.databases WHERE name = @databaseName";
            stateCommand.Parameters.AddWithValue("@databaseName", databaseName);
            var state = await stateCommand.ExecuteScalarAsync(cancellationToken) as string;

            if (string.Equals(state, "ONLINE", StringComparison.OrdinalIgnoreCase))
                return;

            await Task.Delay(OnlinePollInterval, cancellationToken);
        }

        throw new TimeoutException($"Database '{databaseName}' did not become ONLINE on Azure SQL within {OnlineTimeout.TotalMinutes} minutes.");
    }

    #endregion
}
