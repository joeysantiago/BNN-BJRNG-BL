namespace Thakurg.Contracts.Tasks;

// One task as the My Tasks app reads it, with its checklist and attachments. Status (pending, ongoing, overdue, completed) and the date groups are worked out by the app from the local date of the user.
public class TaskDto
{
    public int Id { get; set; }

    public int Priority { get; set; }

    public bool IsStarted { get; set; }

    public int RepeatEvery { get; set; }

    public int? CategoryId { get; set; }

    public DateOnly? DueDate { get; set; }

    public TimeOnly? DueTime { get; set; }

    public DateTime CreatedOn { get; set; }

    public bool RemindEnabled { get; set; }

    public DateTime? DeletedOn { get; set; }

    public string? Description { get; set; }

    public DateTime? ModifiedOn { get; set; }

    public DateTime? CompletedOn { get; set; }

    public string Title { get; set; } = string.Empty;

    public string RepeatType { get; set; } = string.Empty;

    public string RepeatUnit { get; set; } = string.Empty;

    public List<TaskAttachmentDto> Attachments { get; set; } = [];

    public List<TaskChecklistItemDto> Checklist { get; set; } = [];
}
