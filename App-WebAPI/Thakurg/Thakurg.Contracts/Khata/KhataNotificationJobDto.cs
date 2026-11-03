namespace Thakurg.Contracts.Khata;

// An entry change to tell the party about, queued after the entry is saved. UserId is the Khata user who owns the book.
public class KhataNotificationJobDto
{
    public int UserId { get; set; }

    public int ContactId { get; set; }

    public int TransactionId { get; set; }

    public KhataChangeType ChangeType { get; set; }
}
