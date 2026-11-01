namespace Thakurg.Contracts.Configurations;

public class YoutubeOptions
{
    public int MaxResults { get; set; }

    public int StreamCacheMinutes { get; set; }

    public const string SectionName = "YouTube";

    public string FfmpegPath { get; set; } = string.Empty;

    public string AzureFfmpegPath { get; set; } = string.Empty;
}