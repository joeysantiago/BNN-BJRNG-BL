namespace Thakurg.Contracts.YouTube;

public class YoutubeVideoDto
{
    public string Id { get; set; } = string.Empty;

    public int Duration { get; set; }

    public string Thumb { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Artist { get; set; } = string.Empty;
}
