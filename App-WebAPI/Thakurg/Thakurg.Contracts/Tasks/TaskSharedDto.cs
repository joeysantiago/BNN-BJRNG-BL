namespace Thakurg.Contracts.Tasks;

// A task someone shared with the caller (Shared with me): the share (pending or accepted), who shared it and the task itself.
public class TaskSharedDto
{
    public int Id { get; set; }

    public DateTime SharedOn { get; set; }

    public TaskDto Task { get; set; } = new();

    public string Status { get; set; } = string.Empty;

    public string OwnerName { get; set; } = string.Empty;

    public string Permission { get; set; } = string.Empty;
}
