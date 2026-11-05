using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// What happened to a task (created, edited, completed, reopened, deleted, restored, ...). Action is a code the UI names; Detail holds the changed fields or a source title.
public class TaskHistory : BaseEntity
{
    public int Id { get; set; }

    public int TaskId { get; set; }

    public string? Detail { get; set; }

    public string Action { get; set; } = string.Empty;
}
