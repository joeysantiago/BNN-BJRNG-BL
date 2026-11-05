namespace Thakurg.Contracts.Configurations;

// My Tasks (Tasks in appsettings.json): App Lock, where pictures are kept, and the starting values of a new user. A missing section fails at startup.
// The limits (pictures, checklist, categories) are rows of the AppSettings table instead (ITaskLimitsService).
public class TasksOptions
{
    public const string SectionName = "Tasks";

    public TasksPinOptions Pin { get; set; } = new();

    public TasksNewUserOptions NewUser { get; set; } = new();

    public TasksRemindersOptions Reminders { get; set; } = new();

    public TasksLocalFilesOptions LocalFiles { get; set; } = new();
}
