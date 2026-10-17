using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;

namespace DatabaseInitializer.Providers;

public sealed class LocalSqlServer : SqlServerProvisionerBase, ILocalSqlServer
{
    public override string Name => "Local SQL Server";

    protected override string ConnectionStringKey => "MSSQLServer";

    public LocalSqlServer(ILogger<LocalSqlServer> logger) : base(logger)
    {
    }

    #region Private Methods

    protected override async Task DropDatabaseAsync(SqlConnection connection, string quotedName, CancellationToken cancellationToken)
    {
        await using var singleUserCommand = connection.CreateCommand();
        singleUserCommand.CommandText = $"ALTER DATABASE [{quotedName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE";
        await singleUserCommand.ExecuteNonQueryAsync(cancellationToken);

        await using var dropCommand = connection.CreateCommand();
        dropCommand.CommandText = $"DROP DATABASE [{quotedName}]";
        await dropCommand.ExecuteNonQueryAsync(cancellationToken);
    }

    #endregion
}
