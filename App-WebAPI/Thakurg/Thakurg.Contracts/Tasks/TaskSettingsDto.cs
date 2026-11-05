namespace Thakurg.Contracts.Tasks;

// The My Tasks settings of the user, plus whether they may rename the app (super admins only).
public class TaskSettingsDto
{
    public bool CanRename { get; set; }

    public string? Mobile { get; set; }

    public int DefaultPriority { get; set; }

    public int LockAfterMinutes { get; set; }

    public bool OverdueReminders { get; set; }

    public bool UpcomingReminders { get; set; }

    public bool WhatsAppReminders { get; set; }

    public int? DefaultCategoryId { get; set; }

    public bool NotificationsEnabled { get; set; }

    public TaskLimitsDto Limits { get; set; } = new();

    public string TimeZone { get; set; } = string.Empty;

    public string WeekStart { get; set; } = string.Empty;

    public string DefaultTab { get; set; } = string.Empty;

    public string RemindBefore { get; set; } = string.Empty;

    public string ReminderTime { get; set; } = string.Empty;
}
