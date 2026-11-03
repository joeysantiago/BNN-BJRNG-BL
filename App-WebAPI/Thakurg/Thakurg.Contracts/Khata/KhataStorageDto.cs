namespace Thakurg.Contracts.Khata;

// GET / PUT api/khata/storage (super admin): where bill photos are kept for the whole site. The connection string or key is never sent back; HasKey says one is stored.
public class KhataStorageDto
{
    public bool HasKey { get; set; }

    public bool Enabled { get; set; }

    public string? AccountName { get; set; }

    public string? ContainerName { get; set; }

    public string Provider { get; set; } = string.Empty;
}
