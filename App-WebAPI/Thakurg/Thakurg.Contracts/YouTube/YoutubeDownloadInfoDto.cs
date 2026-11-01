namespace Thakurg.Contracts.YouTube;

public class YoutubeDownloadInfoDto
{
    /// <summary>"mp3" when this server converts to MP3, "m4a" when it hands out the original audio.</summary>
    public string Format { get; set; } = string.Empty;
}
