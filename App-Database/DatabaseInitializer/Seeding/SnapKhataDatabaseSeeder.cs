using DatabaseInitializer.SqlScripts;

namespace DatabaseInitializer.Seeding;

public sealed class SnapKhataDatabaseSeeder : IDatabaseSeeder
{
    public string Database => "SnapKhata";

    public string DatabaseName => "thakurg-meta";

    private readonly ISqlScriptRunner _scriptRunner;

    public SnapKhataDatabaseSeeder(ISqlScriptRunner scriptRunner)
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
