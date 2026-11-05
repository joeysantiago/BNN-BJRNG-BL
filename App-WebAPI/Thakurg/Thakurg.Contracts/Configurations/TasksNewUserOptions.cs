namespace Thakurg.Contracts.Configurations;

// Tasks:NewUser: the settings and categories a user starts with the first time they open My Tasks. DefaultCategoryCode names one of Categories.
public class TasksNewUserOptions
{
    public int DefaultPriority { get; set; }

    public int LockAfterMinutes { get; set; }

    public bool OverdueReminders { get; set; }

    public bool UpcomingReminders { get; set; }

    public bool WhatsAppReminders { get; set; }

    public bool NotificationsEnabled { get; set; }

    public string TimeZone { get; set; } = string.Empty;

    public string WeekStart { get; set; } = string.Empty;

    public string DefaultTab { get; set; } = string.Empty;

    public string RemindBefore { get; set; } = string.Empty;

    public string ReminderTime { get; set; } = string.Empty;

    public string DefaultCategoryCode { get; set; } = string.Empty;

    public List<TasksCategoryOptions> Categories { get; set; } = [];
}
