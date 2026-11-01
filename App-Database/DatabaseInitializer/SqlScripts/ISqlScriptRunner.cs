namespace DatabaseInitializer.SqlScripts;

public interface ISqlScriptRunner
{
    Task RunAsync(string database, string connectionString, string scriptsRootPath, CancellationToken cancellationToken);
}
