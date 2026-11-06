using DatabaseInitializer.SqlScripts;

namespace DatabaseInitializer.Seeding;

// SnapTracker: the tables in SqlScripts/CREATE/Tracker (its Apps, PageNames, Features, Messages and Translations rows stay in Common's INSERT files).
public sealed class TrackerDatabaseSeeder : IDatabaseSeeder
{
    public string Database => "Tracker";

    public string DatabaseName => "thakurg-meta";

    private readonly ISqlScriptRunner _scriptRunner;

    public TrackerDatabaseSeeder(ISqlScriptRunner scriptRunner)
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
