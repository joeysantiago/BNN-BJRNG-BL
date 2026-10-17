using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class MusicTrack : BaseEntity
{
    public int Id { get; set; }

    public int PlayerId { get; set; }

    public int SortOrder { get; set; }

    public string? Artist { get; set; }

    public string? CoverFileName { get; set; }

    public string Title { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;
}
