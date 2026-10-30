using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class KhataTransactionHistory : BaseEntity
{
    public int Id { get; set; }

    public int Version { get; set; }

    public byte ChangeType { get; set; }

    public int TransactionId { get; set; }

    public int ChangedByUserId { get; set; }

    public string SnapshotJson { get; set; } = string.Empty;
}
