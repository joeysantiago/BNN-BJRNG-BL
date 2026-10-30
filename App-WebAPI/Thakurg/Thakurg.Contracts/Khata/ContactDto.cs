namespace Thakurg.Contracts.Khata;

public class ContactDto
{
    public int Id { get; set; }

    public int BookId { get; set; }

    public string? Note { get; set; }

    public string? Email { get; set; }

    public string? Mobile { get; set; }

    public string? Address { get; set; }

    public DateOnly? DueDate { get; set; }

    public long BalanceMinor { get; set; }

    public DateOnly? LastEntryOn { get; set; }

    public bool AllowContactEntries { get; set; }

    public string Name { get; set; } = string.Empty;

    public KhataContactType ContactType { get; set; }

    public KhataShareStatus ShareStatus { get; set; }

    public string RowVersion { get; set; } = string.Empty;
}
