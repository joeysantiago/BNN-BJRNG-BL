using System.Text.RegularExpressions;
using DatabaseInitializer.Providers;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;

namespace DatabaseInitializer.SqlScripts;

public sealed class SqlScriptRunner : ISqlScriptRunner
{
    private readonly ILogger<SqlScriptRunner> _logger;

    private readonly IDatabaseProvisioner _provisioner;

    private static readonly string[] StageFolders = { "CREATE", "INSERT" };

    private static readonly Regex BatchSeparator = new(@"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public SqlScriptRunner(IDatabaseProvisioner provisioner, ILogger<SqlScriptRunner> logger)
    {
        _provisioner = provisioner;
        _logger = logger;
    }

    #region Public Methods

    public async Task RunAsync(string database, string connectionString, string scriptsRootPath, CancellationToken cancellationToken)
    {
        await _provisioner.EnsureDatabaseReadyAsync(connectionString, cancellationToken);

        foreach (var stage in StageFolders)
        {
            var stageFolder = Path.Combine(scriptsRootPath, stage, database);
            if (!Directory.Exists(stageFolder))
                continue;

            var scriptFiles = Directory.GetFiles(stageFolder, "*.sql")
                .Where(f => !Path.GetFileName(f).StartsWith('_'))
                .OrderBy(f => f, StringComparer.OrdinalIgnoreCase);

            foreach (var scriptFile in scriptFiles)
            {
                _logger.LogInformation("Executing {Stage}/{Database} script {Script}", stage, database, Path.GetFileName(scriptFile));
                await ExecuteScriptAsync(connectionString, scriptFile, cancellationToken);
            }
        }
    }

    #endregion

    #region Private Methods

    private static async Task ExecuteScriptAsync(string connectionString, string scriptFile, CancellationToken cancellationToken)
    {
        var script = await File.ReadAllTextAsync(scriptFile, cancellationToken);

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        foreach (var batch in BatchSeparator.Split(script))
        {
            if (string.IsNullOrWhiteSpace(batch))
                continue;

            await using var command = new SqlCommand(batch, connection);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    #endregion
}
