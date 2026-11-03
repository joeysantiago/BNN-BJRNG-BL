namespace Thakurg.Contracts.Khata;

// Photo is the version of the contact's picture (it changes with every upload, so its URL can be cached); null = no picture.
public class ContactDto
{
    public int Id { get; set; }

    public int BookId { get; set; }

    public string? Note { get; set; }

    public string? Email { get; set; }

    public string? Photo { get; set; }

    public string? Mobile { get; set; }

    public string? Address { get; set; }

    public DateOnly? DueDate { get; set; }

    public long BalanceMinor { get; set; }

    public DateOnly? LastEntryOn { get; set; }

    public bool AllowContactEntries { get; set; }

    public string Name { get; set; } = string.Empty;

    public KhataContactType ContactType { get; set; }

    public KhataShareStatus ShareStatus { get; set; }

    public ContactNotifyDto Notify { get; set; } = new();

    public string RowVersion { get; set; } = string.Empty;
}
