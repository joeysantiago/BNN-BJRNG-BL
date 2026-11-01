namespace Thakurg.Contracts.Khata;

public class TransactionSnapshotDto
{
    public string? Note { get; set; }

    public long AmountMinor { get; set; }

    public DateOnly EntryDate { get; set; }

    public KhataEntryType EntryType { get; set; }
}
