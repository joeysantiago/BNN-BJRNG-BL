namespace Thakurg.Contracts.Tasks;

// A user who gets WhatsApp reminders of My Tasks: switched on, with a mobile number in the profile and access to the app.
public class TaskReminderRecipientDto
{
    public int UserId { get; set; }

    public bool OverdueReminders { get; set; }

    public bool UpcomingReminders { get; set; }

    public string Mobile { get; set; } = string.Empty;

    public string Language { get; set; } = string.Empty;

    public string TimeZone { get; set; } = string.Empty;

    public string RemindBefore { get; set; } = string.Empty;

    public string ReminderTime { get; set; } = string.Empty;
}
