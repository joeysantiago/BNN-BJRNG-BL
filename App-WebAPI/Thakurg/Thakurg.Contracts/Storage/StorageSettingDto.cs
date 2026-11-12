namespace Thakurg.Contracts.Storage;

// GET / PUT api/admin/storage (super admin): the chosen store and where each one keeps files. AzureReady says the server has the Azure connection
// string; the connection string itself is never sent.
public class StorageSettingDto
{
    public bool AzureReady { get; set; }

    public string Provider { get; set; } = string.Empty;

    public string LocalRoot { get; set; } = string.Empty;

    public string ContainerName { get; set; } = string.Empty;

    public string EnvironmentFolder { get; set; } = string.Empty;
}
