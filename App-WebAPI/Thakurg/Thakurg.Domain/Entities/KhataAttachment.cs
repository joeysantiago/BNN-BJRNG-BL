using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// A bill photo of an entry. Where its bytes are kept is in KhataStoredFiles.
public class KhataAttachment : BaseEntity
{
    public int Id { get; set; }

    public int SortOrder { get; set; }

    public long SizeBytes { get; set; }

    public string? TempPath { get; set; }

    public int TransactionId { get; set; }

    public string Md5 { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;
}
