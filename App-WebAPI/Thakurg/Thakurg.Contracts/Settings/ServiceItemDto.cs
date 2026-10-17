namespace Thakurg.Contracts.Settings;

public class ServiceItemDto
{
    public bool Enabled { get; set; }

    public string? ProbeUrl { get; set; }

    public string? StatusPage { get; set; }

    public string Id { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Group { get; set; } = string.Empty;
}
