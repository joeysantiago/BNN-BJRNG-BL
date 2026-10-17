namespace Thakurg.Contracts.Settings;

public class ServicesSettingsDto
{
    public bool Enabled { get; set; }

    public int RefreshSeconds { get; set; }

    public List<ServiceItemDto> Items { get; set; } = new();
}
