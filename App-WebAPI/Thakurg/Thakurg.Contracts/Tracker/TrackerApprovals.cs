namespace Thakurg.Contracts.Tracker;

// What happens to a new SMS transaction: everything waits for the user, approve when sure (smart), or approve everything.
public static class TrackerApprovals
{
    public const string Auto = "auto";

    public const string Smart = "smart";

    public const string Review = "review";

    public static readonly string[] All = [Review, Smart, Auto];
}
