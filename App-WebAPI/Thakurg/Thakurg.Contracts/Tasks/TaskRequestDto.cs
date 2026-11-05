namespace Thakurg.Contracts.Tasks;

// A new task or the edited fields of one. The checklist is the whole list in order: lines with an Id are kept (and updated), new ones have none, missing ones are removed.
public class TaskRequestDto
{
    public int Priority { get; set; }

    public bool IsStarted { get; set; }

    public int RepeatEvery { get; set; }

    public int? CategoryId { get; set; }

    public DateOnly? DueDate { get; set; }

    public TimeOnly? DueTime { get; set; }

    public bool RemindEnabled { get; set; }

    public string? Description { get; set; }

    public string Title { get; set; } = string.Empty;

    public string RepeatType { get; set; } = string.Empty;

    public string RepeatUnit { get; set; } = string.Empty;

    public List<TaskChecklistRequestDto> Checklist { get; set; } = [];
}
