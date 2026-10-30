using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class KhataTransaction : BaseEntity
{
    public int Id { get; set; }

    public int BookId { get; set; }

    public byte Source { get; set; }

    public int Version { get; set; }

    public string? Note { get; set; }

    public int ContactId { get; set; }

    public byte EntryType { get; set; }

    public int? ImportJobId { get; set; }

    public long AmountMinor { get; set; }

    public int AddedByUserId { get; set; }

    public DateOnly EntryDate { get; set; }

    public byte[] RowVersion { get; set; } = [];

    public string? ImportFingerprint { get; set; }
}
