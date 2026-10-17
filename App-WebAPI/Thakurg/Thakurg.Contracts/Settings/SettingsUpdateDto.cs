namespace Thakurg.Contracts.Settings;

public class SettingsUpdateDto
{
    public ServicesUpdateDto? Services { get; set; }

    public ConnectionUpdateDto? Connection { get; set; }

    public Dictionary<string, bool>? Features { get; set; }
}
