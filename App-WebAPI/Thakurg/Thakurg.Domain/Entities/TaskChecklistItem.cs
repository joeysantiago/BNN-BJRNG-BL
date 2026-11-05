using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// One checklist line (subtask) of a task, in SortOrder.
public class TaskChecklistItem : BaseEntity
{
    public int Id { get; set; }

    public int TaskId { get; set; }

    public bool IsDone { get; set; }

    public int SortOrder { get; set; }

    public DateTime? DoneOn { get; set; }

    public string Text { get; set; } = string.Empty;
}
