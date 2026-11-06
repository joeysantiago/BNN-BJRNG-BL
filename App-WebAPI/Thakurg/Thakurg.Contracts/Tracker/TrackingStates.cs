namespace Thakurg.Contracts.Tracker;

// SMS reading on the phone: not allowed yet, on, or paused (allowed, but not reading).
public static class TrackingStates
{
    public const string Paused = "paused";

    public const string Enabled = "enabled";

    public const string Permission = "permission";
}
