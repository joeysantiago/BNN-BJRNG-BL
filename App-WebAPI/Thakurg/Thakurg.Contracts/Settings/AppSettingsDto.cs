namespace Thakurg.Contracts.Settings;

public class AppSettingsDto
{
    public SpeedSettingsDto Speed { get; set; } = new();

    public ServicesSettingsDto Services { get; set; } = new();

    public ConnectionSettingsDto Connection { get; set; } = new();

    public Dictionary<string, bool> Features { get; set; } = new();

    public Dictionary<string, Dictionary<string, string>> PageNames { get; set; } = new();
}