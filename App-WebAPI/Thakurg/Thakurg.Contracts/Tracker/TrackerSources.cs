namespace Thakurg.Contracts.Tracker;

// Where a SnapTracker transaction came from: a bank or UPI SMS, or typed in by hand.
public static class TrackerSources
{
    public const string Sms = "sms";

    public const string Manual = "manual";
}
