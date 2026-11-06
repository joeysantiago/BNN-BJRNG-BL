namespace Thakurg.Contracts.Configurations;

// SnapTracker (Tracker in appsettings.json): the starting settings of a new user, the limits, the categories, the SMS senders it reads and the merchant
// dictionary of the reader. A missing section fails at startup.
public class TrackerOptions
{
    public const string SectionName = "Tracker";

    public List<string> Categories { get; set; } = [];

    public string TimeZone { get; set; } = string.Empty;

    public string CurrencyCode { get; set; } = string.Empty;

    public TrackerLimitsOptions Limits { get; set; } = new();

    public TrackerNewUserOptions NewUser { get; set; } = new();

    public Dictionary<string, string> Senders { get; set; } = [];

    public List<TrackerMerchantOptions> Merchants { get; set; } = [];
}
