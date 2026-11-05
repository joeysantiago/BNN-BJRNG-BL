namespace Thakurg.Contracts.Tasks;

public class TaskChecklistItemDto
{
    public int Id { get; set; }

    public bool IsDone { get; set; }

    public DateTime? DoneOn { get; set; }

    public string Text { get; set; } = string.Empty;
}
