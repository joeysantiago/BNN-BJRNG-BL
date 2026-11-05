namespace Thakurg.Contracts.Tasks;

// One line of the history of a task. Action is one of TaskHistoryActions.
public class TaskHistoryDto
{
    public DateTime At { get; set; }

    public string? Detail { get; set; }

    public string Action { get; set; } = string.Empty;
}
