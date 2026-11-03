namespace Thakurg.Contracts.Khata;

public class BookSummaryDto
{
    public int EntryCount { get; set; }

    public int ToGetCount { get; set; }

    public int ToGiveCount { get; set; }

    public BookDto Book { get; set; } = new();

    public List<BookMonthDto> Months { get; set; } = [];

    public List<TransactionDto> Recent { get; set; } = [];

    public List<ContactDto> TopContacts { get; set; } = [];
}
