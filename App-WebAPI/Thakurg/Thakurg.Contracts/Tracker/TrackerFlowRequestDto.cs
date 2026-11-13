namespace Thakurg.Contracts.Tracker;

// What a transaction counts towards (TrackerFlows); Remember also applies it to the merchant's other transactions, or for an EMI without a merchant makes
// a loan of this amount, so every debit of about the same amount is that EMI.
public class TrackerFlowRequestDto
{
    public bool Remember { get; set; }

    public string Flow { get; set; } = string.Empty;
}
