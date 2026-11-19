namespace Thakurg.Contracts.Tracker;

// A bank account, credit card or loan of the user (amounts in rupees): a card's latest statement, a loan's EMI. BankCode is the bank's code of
// Tracker:Senders ("HDFCBK"), by which the app shows its logo; null when the bank is not known.
public class TrackerAccountDto
{
    public int Id { get; set; }

    public string? Label { get; set; }

    public decimal? Emi { get; set; }

    public DateTime? DueOn { get; set; }

    public string? BankCode { get; set; }

    public decimal? StatementTotal { get; set; }

    public string Last4 { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public string Provider { get; set; } = string.Empty;
}
