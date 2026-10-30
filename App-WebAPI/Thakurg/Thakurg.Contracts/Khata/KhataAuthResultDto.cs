namespace Thakurg.Contracts.Khata;

public class KhataAuthResultDto
{
    public bool HasPin { get; set; }

    public bool Unlocked { get; set; }

    public byte StorageProvider { get; set; }

    public int ExpiresInSeconds { get; set; }

    public string AccessToken { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;
}
