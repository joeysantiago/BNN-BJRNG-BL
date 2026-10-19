namespace Thakurg.Contracts.Configurations;

public class YoutubeOptions
{
    public int MaxResults { get; set; } = 20;

    public const string SectionName = "YouTube";

    public int StreamCacheMinutes { get; set; } = 20;

    public string FfmpegPath { get; set; } = "ffmpeg";

    public string AzureFfmpegPath { get; set; } = string.Empty;
}