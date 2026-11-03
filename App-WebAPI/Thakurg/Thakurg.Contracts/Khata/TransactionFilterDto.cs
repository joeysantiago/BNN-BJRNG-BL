namespace Thakurg.Contracts.Khata;

// A checked entry-list query: exactly one of ContactId / BookId sets the scope.
public class TransactionFilterDto
{
    public int Page { get; set; }

    public int? BookId { get; set; }

    public DateOnly? To { get; set; }

    public int PageSize { get; set; }

    public DateOnly? From { get; set; }

    public int? ContactId { get; set; }

    public string? Search { get; set; }

    public KhataEntryKind Kind { get; set; }

    public KhataEntrySort Sort { get; set; }

    public bool SearchContactName { get; set; }
}
