namespace Thakurg.Contracts.Khata;

public class TransactionRequestDto
{
    public string? Note { get; set; }

    public long AmountMinor { get; set; }

    public DateOnly EntryDate { get; set; }

    public string? RowVersion { get; set; }

    public KhataEntryType EntryType { get; set; }
}
