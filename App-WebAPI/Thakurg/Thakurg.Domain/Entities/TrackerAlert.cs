using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// An alert of the bell list (TrackerAlerts). Args is JSON (merchant, amount, credit); the text is built in the UI.
public class TrackerAlert : BaseEntity
{
    public int Id { get; set; }

    public bool IsRead { get; set; }

    public int TrackerUserId { get; set; }

    public int? TransactionId { get; set; }

    public string Args { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;
}
