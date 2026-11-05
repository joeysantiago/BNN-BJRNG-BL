using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// One task of one user (TaskUsers). Due date and time are the user's local calendar; the date groups (Today, January 2027, ...) are worked out from them, never from CreatedOn.
// Delete is soft (IsSoftDeleted + DeletedOn), so a task can be restored. Repeat: when a repeating task is completed the next one is created once (RepeatSpawned).
public class TaskItem : BaseEntity
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int Priority { get; set; }

    public bool IsStarted { get; set; }

    public int RepeatEvery { get; set; }

    public int? CategoryId { get; set; }

    public DateOnly? DueDate { get; set; }

    public TimeOnly? DueTime { get; set; }

    public bool RemindEnabled { get; set; }

    public bool RepeatSpawned { get; set; }

    public DateTime? DeletedOn { get; set; }

    public string? Description { get; set; }

    public DateTime? CompletedOn { get; set; }

    public DateTime? LastCompletedOn { get; set; }

    public string Title { get; set; } = string.Empty;

    public string RepeatType { get; set; } = string.Empty;

    public string RepeatUnit { get; set; } = string.Empty;

    public List<TaskAttachment> Attachments { get; set; } = [];

    public List<TaskChecklistItem> ChecklistItems { get; set; } = [];
}
