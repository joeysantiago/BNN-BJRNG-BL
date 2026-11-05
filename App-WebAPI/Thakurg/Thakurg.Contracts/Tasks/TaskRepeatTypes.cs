namespace Thakurg.Contracts.Tasks;

// How a task repeats. Custom repeats every RepeatEvery RepeatUnit (one of Units).
public static class TaskRepeatTypes
{
    public const string None = "none";

    public const string Daily = "daily";

    public const string Custom = "custom";

    public const string Weekly = "weekly";

    public const string Yearly = "yearly";

    public const string Monthly = "monthly";

    public static readonly string[] Units = ["day", "week", "month", "year"];

    public static readonly string[] All = [None, Daily, Weekly, Monthly, Yearly, Custom];
}
