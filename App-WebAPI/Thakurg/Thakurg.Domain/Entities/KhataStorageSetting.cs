using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// Where SnapKhata keeps bill photos for the whole site (one row). Provider = KhataStorageProvider; SecretProtected is the Azure connection string,
// encrypted with ASP.NET Data Protection, never stored or returned in plain text.
public class KhataStorageSetting : BaseEntity
{
    public int Id { get; set; }

    public bool Enabled { get; set; }

    public byte Provider { get; set; }

    public string? AccountName { get; set; }

    public string? ContainerName { get; set; }

    public string? SecretProtected { get; set; }
}
