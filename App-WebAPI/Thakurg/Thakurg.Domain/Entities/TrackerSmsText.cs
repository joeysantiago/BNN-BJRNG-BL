using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// An original SMS (TrackerSmsTexts). BodyProtected is encrypted; BodyHash finds the same message sent twice without decrypting. TransactionId is the
// transaction made from it; a merchant's "payment received" SMS has none: it confirms a bank's transaction instead (TrackerTransaction.ConfirmedBySmsId).
public class TrackerSmsText : BaseEntity
{
    public int Id { get; set; }

    public int TrackerUserId { get; set; }

    public int? TransactionId { get; set; }

    public DateTime ReceivedOn { get; set; }

    public string Marks { get; set; } = string.Empty;

    public string BodyHash { get; set; } = string.Empty;

    public string SenderName { get; set; } = string.Empty;

    public string SenderHeader { get; set; } = string.Empty;

    public string BodyProtected { get; set; } = string.Empty;
}
