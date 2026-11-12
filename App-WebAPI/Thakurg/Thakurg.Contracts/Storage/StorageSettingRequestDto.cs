namespace Thakurg.Contracts.Storage;

// PUT api/admin/storage: local or azure (StorageProviders).
public class StorageSettingRequestDto
{
    public string Provider { get; set; } = string.Empty;
}
