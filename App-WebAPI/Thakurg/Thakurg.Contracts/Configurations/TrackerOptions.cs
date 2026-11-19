namespace Thakurg.Contracts.Configurations;

// Tracker (Tracker in appsettings.json): the starting settings of a new user, the limits, the categories, the SMS senders it reads (banks, and merchants
// whose "payment received" SMS confirms a bank's debit) and the merchant dictionary of the reader. A missing section fails at startup.
public class TrackerOptions
{
    public const string SectionName = "Tracker";

    public List<string> Categories { get; set; } = [];

    public string TimeZone { get; set; } = string.Empty;

    public string CurrencyCode { get; set; } = string.Empty;

    public TrackerLimitsOptions Limits { get; set; } = new();

    public TrackerNewUserOptions NewUser { get; set; } = new();

    public List<TrackerMerchantOptions> Merchants { get; set; } = [];

    public Dictionary<string, TrackerSenderOptions> Senders { get; set; } = [];

    public List<TrackerMerchantSenderOptions> MerchantSenders { get; set; } = [];
}
