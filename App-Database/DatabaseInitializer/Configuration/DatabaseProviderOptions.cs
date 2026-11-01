namespace DatabaseInitializer.Configuration;

public sealed class DatabaseProviderOptions
{
    public bool UseLocalServer { get; set; }

    public bool UseAzureSqlServer { get; set; }

    public const string SectionName = "DatabaseProvider";
}
