using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// One attempt to tell a party about an entry (KhataNotifyChannel, KhataNotifyStatus). UserId is the Khata user who owns the book.
public class KhataNotificationLog : BaseEntity
{
    public int Id { get; set; }

    public byte Status { get; set; }

    public int? UserId { get; set; }

    public byte Channel { get; set; }

    public string? Error { get; set; }

    public int? ContactId { get; set; }

    public int? TransactionId { get; set; }

    public string? ProviderMessageId { get; set; }

    public string Template { get; set; } = string.Empty;
}
