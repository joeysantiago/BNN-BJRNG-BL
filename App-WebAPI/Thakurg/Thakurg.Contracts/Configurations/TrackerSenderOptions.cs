namespace Thakurg.Contracts.Configurations;

// One bank or payment app of Tracker:Senders (keyed by its DLT header, "HDFCBK"): the name shown and the bank's own code (the same for every header of one
// bank, "HDFCBN" is "HDFCBK"), by which the app shows the bank's logo.
public class TrackerSenderOptions
{
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}
