using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// One picture of a task. FileId is the file's path under Tasks:LocalFiles:Root ("<userId>/<taskId>/<name>"); only the task's owner can open it.
public class TaskAttachment : BaseEntity
{
    public int Id { get; set; }

    public int TaskId { get; set; }

    public int SortOrder { get; set; }

    public long SizeBytes { get; set; }

    public string FileId { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;
}
