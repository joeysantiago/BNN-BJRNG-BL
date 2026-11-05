namespace Thakurg.Contracts.Tasks;

// One checklist line of TaskRequestDto. Id is null for a new line.
public class TaskChecklistRequestDto
{
    public int? Id { get; set; }

    public bool IsDone { get; set; }

    public string Text { get; set; } = string.Empty;
}
