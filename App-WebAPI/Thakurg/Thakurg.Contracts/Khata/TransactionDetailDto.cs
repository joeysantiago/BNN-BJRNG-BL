namespace Thakurg.Contracts.Khata;

public class TransactionDetailDto
{
    public int BookId { get; set; }

    public ContactDto Contact { get; set; } = new();

    public TransactionDto Entry { get; set; } = new();

    public List<AttachmentDto> Attachments { get; set; } = [];
}
