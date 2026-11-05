namespace Thakurg.Contracts.Auth;

// The apps a user can be given access to. Each code is a row in the Apps table (Common/010_Apps.sql). Speedtest is open to everyone, so it has no code.
public static class AppCodes
{
    public const string Hr = "hr";

    public const string Creta = "creta";

    public const string Khata = "khata";

    public const string Nexon = "nexon";

    public const string Tasks = "tasks";

    public const string Tracker = "tracker";

    public const string Youtube = "youtube";
}
