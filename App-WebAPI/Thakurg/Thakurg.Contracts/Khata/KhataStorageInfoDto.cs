namespace Thakurg.Contracts.Khata;

// Where new bill photos go: KhataStorageProviders.Local or Azure.
public class KhataStorageInfoDto
{
    public string Provider { get; set; } = string.Empty;
}
