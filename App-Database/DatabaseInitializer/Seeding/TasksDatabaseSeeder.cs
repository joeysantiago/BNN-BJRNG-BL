using DatabaseInitializer.SqlScripts;

namespace DatabaseInitializer.Seeding;

// My Tasks: the tables in SqlScripts/CREATE/Tasks (its Apps, PageNames, Features, Messages and Translations rows stay in Common's INSERT files).
public sealed class TasksDatabaseSeeder : IDatabaseSeeder
{
    public string Database => "Tasks";

    public string DatabaseName => "thakurg-meta";

    private readonly ISqlScriptRunner _scriptRunner;

    public TasksDatabaseSeeder(ISqlScriptRunner scriptRunner)
    {
        _scriptRunner = scriptRunner;
    }

    #region Public Methods

    public Task RunAsync(string connectionString, string scriptsRootPath, CancellationToken cancellationToken)
    {
        return _scriptRunner.RunAsync(Database, connectionString, scriptsRootPath, cancellationToken);
    }

    #endregion
}
