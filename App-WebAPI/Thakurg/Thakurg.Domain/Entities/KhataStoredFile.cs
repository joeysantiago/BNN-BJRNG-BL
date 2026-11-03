using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// One stored copy of a file (a bill photo, ledger.json, ...). For Provider = Local, FileId is the path under Khata:LocalFiles:Root.
public class KhataStoredFile : BaseEntity
{
    public int Id { get; set; }

    public byte Role { get; set; }

    public int UserId { get; set; }

    public int? BookId { get; set; }

    public byte FileKind { get; set; }

    public byte Provider { get; set; }

    public int? ContactId { get; set; }

    public string? FileId { get; set; }

    public byte SyncStatus { get; set; }

    public int SyncAttempts { get; set; }

    public string? FolderId { get; set; }

    public int? AttachmentId { get; set; }

    public string? LastError { get; set; }

    public int? GoogleConnectionId { get; set; }
}
