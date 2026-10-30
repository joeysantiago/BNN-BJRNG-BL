namespace Thakurg.Contracts.Khata;

public class TransactionDto
{
    public int Id { get; set; }

    public int Version { get; set; }

    public string? Note { get; set; }

    public int ContactId { get; set; }

    public bool AddedByMe { get; set; }

    public bool IsDeleted { get; set; }

    public long AmountMinor { get; set; }

    public int AddedByUserId { get; set; }

    public DateOnly EntryDate { get; set; }

    public DateTime CreatedOn { get; set; }

    public DateTime? ModifiedOn { get; set; }

    public KhataEntryType EntryType { get; set; }

    public string RowVersion { get; set; } = string.Empty;
}
