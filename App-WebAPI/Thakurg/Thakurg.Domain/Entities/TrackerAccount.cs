using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// A bank account, credit card or loan of a SnapTracker user (TrackerAccounts), found in the SMS: AccountType is bank, card or loan (TrackerAccountTypes),
// Last4 the last digits the bank shows. A card keeps its latest statement (total and due date); a loan its EMI (EmiMinor, in paise), by which EMI debits
// are linked to it. Label is the user's own name for it ("ICICI salary", "Car loan").
public class TrackerAccount : BaseEntity
{
    public int Id { get; set; }

    public string? Label { get; set; }

    public long? EmiMinor { get; set; }

    public int TrackerUserId { get; set; }

    public DateTime? StatementDueOn { get; set; }

    public long? StatementTotalMinor { get; set; }

    public string Last4 { get; set; } = string.Empty;

    public string Provider { get; set; } = string.Empty;

    public string AccountType { get; set; } = string.Empty;
}
