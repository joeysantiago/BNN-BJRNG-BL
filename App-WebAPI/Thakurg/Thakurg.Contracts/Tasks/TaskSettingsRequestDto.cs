namespace Thakurg.Contracts.Tasks;

public class TaskSettingsRequestDto
{
    public int DefaultPriority { get; set; }

    public int LockAfterMinutes { get; set; }

    public bool OverdueReminders { get; set; }

    public bool UpcomingReminders { get; set; }

    public bool WhatsAppReminders { get; set; }

    public int? DefaultCategoryId { get; set; }

    public bool NotificationsEnabled { get; set; }

    public string TimeZone { get; set; } = string.Empty;

    public string WeekStart { get; set; } = string.Empty;

    public string DefaultTab { get; set; } = string.Empty;

    public string RemindBefore { get; set; } = string.Empty;

    public string ReminderTime { get; set; } = string.Empty;
}
