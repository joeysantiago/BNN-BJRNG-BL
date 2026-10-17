namespace Thakurg.Contracts.Music;

public class MusicTrackDto
{
    public int Id { get; set; }

    public string? Artist { get; set; }

    public string? CoverUrl { get; set; }

    public string Title { get; set; } = string.Empty;

    public string AudioUrl { get; set; } = string.Empty;
}
