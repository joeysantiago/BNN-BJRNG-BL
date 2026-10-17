namespace Thakurg.Contracts.Configurations;

public class MusicStorageOptions
{
    public string Root { get; set; } = "App-Data";

    public const string SectionName = "MusicStorage";

    public string[] CoverExtensions { get; set; } = [".jpg", ".jpeg", ".png", ".webp"];

    public string[] AudioExtensions { get; set; } = [".mp3", ".m4a", ".aac", ".ogg", ".oga", ".opus", ".wav", ".flac", ".weba"];
}