using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// One reminder sent (or tried) for a task: Kind (due, overdue, upcoming) on ForDate (the local date of the user) through Channel (whatsapp). One per task, kind and day.
public class TaskReminderLog : BaseEntity
{
    public int Id { get; set; }

    public int TaskId { get; set; }

    public string? Error { get; set; }

    public DateOnly ForDate { get; set; }

    public string Kind { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string Channel { get; set; } = string.Empty;
}
