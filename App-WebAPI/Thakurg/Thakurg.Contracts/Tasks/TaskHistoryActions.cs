namespace Thakurg.Contracts.Tasks;

// The codes of TaskHistory.Action. The app names each one (tasks.hist.<code>).
public static class TaskHistoryActions
{
    public const string Edited = "edited";

    public const string Created = "created";

    public const string Deleted = "deleted";

    public const string Reopened = "reopened";

    public const string Repeated = "repeated";

    public const string Restored = "restored";

    public const string Completed = "completed";

    public const string Duplicated = "duplicated";

    public const string AutoReopened = "auto-reopened";

    public const string AutoCompleted = "auto-completed";
}
