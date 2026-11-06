namespace Thakurg.Contracts.Tracker;

// The kinds of SnapTracker alert a user can switch on or off (tracker.alert.<type> in the UI).
public static class TrackerAlertTypes
{
    public const string Sync = "sync";

    public const string NewTx = "newTx";

    public const string Paused = "paused";

    public const string Verify = "verify";

    public const string Revoked = "revoked";

    public const string Duplicate = "duplicate";

    public const string Categorized = "categorized";

    public static readonly string[] All = [NewTx, Categorized, Verify, Duplicate, Revoked, Paused, Sync];
}
