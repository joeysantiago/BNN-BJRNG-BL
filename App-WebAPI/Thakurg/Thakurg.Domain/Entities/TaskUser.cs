using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// The My Tasks profile of one common account (Users): the app's own App Lock PIN and preferences. SnapKhata keeps its own, separate row.
public class TaskUser : BaseEntity
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string? PinHash { get; set; }

    public int PinFailedCount { get; set; }

    public int DefaultPriority { get; set; }

    public int LockAfterMinutes { get; set; }

    public bool OverdueReminders { get; set; }

    public bool UpcomingReminders { get; set; }

    public bool WhatsAppReminders { get; set; }

    public int? DefaultCategoryId { get; set; }

    public DateTime? PinLockedUntil { get; set; }

    public bool NotificationsEnabled { get; set; }

    public string TimeZone { get; set; } = string.Empty;

    public string WeekStart { get; set; } = string.Empty;

    public string DefaultTab { get; set; } = string.Empty;

    public string RemindBefore { get; set; } = string.Empty;

    public string ReminderTime { get; set; } = string.Empty;
}
