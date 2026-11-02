namespace Thakurg.Contracts.Configurations;

public class MusicStorageOptions
{
    public int CacheMinutes { get; set; }

    public string Root { get; set; } = string.Empty;

    public const string SectionName = "MusicStorage";

    public string[] AudioExtensions { get; set; } = [];

    public string[] CoverExtensions { get; set; } = [];
}