namespace Thakurg.Contracts.Configurations;

// FileStorage in appsettings.json: where every app keeps its files. Local = LocalRoot (App-Data, relative to the API's content root); Azure = the
// ContainerName Blob container, under EnvironmentFolder (dev, QA, UAT, thakurg). The connection string is the configuration value named
// ConnectionStringName (the AzureStorageConnectionString environment variable), never written in appsettings.
public class FileStorageOptions
{
    public int MaxRetries { get; set; }

    public int CacheSeconds { get; set; }

    public int NetworkTimeoutSeconds { get; set; }

    public const string SectionName = "FileStorage";

    public string LocalRoot { get; set; } = string.Empty;

    public string ContainerName { get; set; } = string.Empty;

    public string EnvironmentFolder { get; set; } = string.Empty;

    public string ConnectionStringName { get; set; } = string.Empty;
}
