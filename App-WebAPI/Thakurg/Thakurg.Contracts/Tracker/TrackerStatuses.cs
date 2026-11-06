namespace Thakurg.Contracts.Tracker;

// The status of a SnapTracker transaction. Ignored and duplicate transactions are not counted in any total.
public static class TrackerStatuses
{
    public const string Auto = "auto";

    public const string Ignored = "ignored";

    public const string Pending = "pending";

    public const string Confirmed = "confirmed";

    public const string Duplicate = "duplicate";
}
