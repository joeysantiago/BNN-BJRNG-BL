namespace Thakurg.Contracts.Tasks;

// One action on several tasks: Action is one of TaskBulkActions; CategoryId is the target of "category" (null = no category).
public class TaskBulkRequestDto
{
    public int? CategoryId { get; set; }

    public List<int> Ids { get; set; } = [];

    public string Action { get; set; } = string.Empty;
}
