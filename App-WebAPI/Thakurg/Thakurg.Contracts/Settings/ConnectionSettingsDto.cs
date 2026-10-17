namespace Thakurg.Contracts.Settings;

public class ConnectionSettingsDto
{
    public bool Enabled { get; set; }

    public Dictionary<string, bool> Fields { get; set; } = new();
}
