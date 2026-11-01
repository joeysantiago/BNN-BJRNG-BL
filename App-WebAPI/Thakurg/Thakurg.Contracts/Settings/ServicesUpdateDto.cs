namespace Thakurg.Contracts.Settings;

public class ServicesUpdateDto
{
    public bool? Enabled { get; set; }

    public int? RefreshSeconds { get; set; }

    public Dictionary<string, bool>? Items { get; set; }
}
