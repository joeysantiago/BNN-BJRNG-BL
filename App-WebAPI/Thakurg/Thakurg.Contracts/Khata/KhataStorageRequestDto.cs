namespace Thakurg.Contracts.Khata;

// PUT api/khata/storage. ConnectionString is a full Azure Storage connection string or only the account key (then AccountName is needed); blank keeps the stored one.
public class KhataStorageRequestDto
{
    public bool Enabled { get; set; }

    public string? AccountName { get; set; }

    public string? ContainerName { get; set; }

    public string? ConnectionString { get; set; }

    public string Provider { get; set; } = string.Empty;
}
