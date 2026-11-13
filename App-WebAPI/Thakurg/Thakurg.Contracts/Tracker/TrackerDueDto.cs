namespace Thakurg.Contracts.Tracker;

// What a reminder or statement says is due: a card's statement or a loan's EMI (AccountType card or loan), its last digits, the bank, the amount (rupees)
// and the due date when the message gives one. It is kept on the account; the message itself is not a transaction.
public class TrackerDueDto
{
    public decimal Amount { get; set; }

    public DateTime? DueOn { get; set; }

    public string Last4 { get; set; } = string.Empty;

    public string Provider { get; set; } = string.Empty;

    public string AccountType { get; set; } = string.Empty;
}
