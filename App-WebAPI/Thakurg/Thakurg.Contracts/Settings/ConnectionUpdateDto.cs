namespace Thakurg.Contracts.Settings;

public class ConnectionUpdateDto
{
    public bool? Enabled { get; set; }

    public Dictionary<string, bool>? Fields { get; set; }
}
