using DatabaseInitializer.SqlScripts;

namespace DatabaseInitializer.Seeding;

public sealed class MusicDatabaseSeeder : IDatabaseSeeder
{
    public string Database => "Music";

    private readonly ISqlScriptRunner _scriptRunner;

    public MusicDatabaseSeeder(ISqlScriptRunner scriptRunner)
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
