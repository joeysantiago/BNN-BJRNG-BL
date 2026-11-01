namespace Thakurg.Contracts.Khata;

public class TransactionHistoryDto
{
    public int Version { get; set; }

    public DateTime ChangedOn { get; set; }

    public int ChangedByUserId { get; set; }

    public KhataChangeType ChangeType { get; set; }

    public TransactionSnapshotDto Snapshot { get; set; } = new();
}
