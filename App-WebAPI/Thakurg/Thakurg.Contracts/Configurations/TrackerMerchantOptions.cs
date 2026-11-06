namespace Thakurg.Contracts.Configurations;

// One entry of the merchant dictionary (Tracker:Merchants): a pattern (regular expression, case ignored), the name shown, the category and an
// optional kind the description uses (subscription, electricity, telecom).
public class TrackerMerchantOptions
{
    public string? Kind { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Pattern { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;
}
