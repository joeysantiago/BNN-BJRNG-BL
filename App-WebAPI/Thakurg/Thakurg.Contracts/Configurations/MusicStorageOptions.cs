namespace Thakurg.Contracts.Configurations;

// MusicStorage in appsettings.json: how long players and track lists stay in memory, and the file types a song upload may hold. The songs themselves
// are kept in the file store of FileStorage, in each player's folder.
public class MusicStorageOptions
{
    public int CacheMinutes { get; set; }

    public const string SectionName = "MusicStorage";

    public string[] AudioExtensions { get; set; } = [];

    public string[] CoverExtensions { get; set; } = [];
}
