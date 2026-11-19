namespace Thakurg.Contracts.Configurations;

// One merchant that sends its own "payment received" SMS (Tracker:MerchantSenders): its DLT header ("JIOPAY"), the merchant name shown, the category
// and an optional kind (telecom, electricity). Such an SMS is never a transaction: it confirms the bank's debit of the same amount.
public class TrackerMerchantSenderOptions
{
    public string? Kind { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string Merchant { get; set; } = string.Empty;
}
