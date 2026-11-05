namespace Thakurg.Contracts.Tasks;

// What a change did: the tasks that are new or changed (a completed repeating task also brings its next one) and the ids of the tasks that were deleted.
public class TaskChangesDto
{
    public List<TaskDto> Tasks { get; set; } = [];

    public List<int> DeletedIds { get; set; } = [];
}
