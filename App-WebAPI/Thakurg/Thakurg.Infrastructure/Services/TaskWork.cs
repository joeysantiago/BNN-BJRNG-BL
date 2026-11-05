using Thakurg.Contracts.Tasks;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// What one call of TaskService changes: new tasks (made, duplicated, repeated), changed and deleted tasks, and the history lines to write once every task has its id.
public class TaskWork
{
    public List<TaskItem> Added { get; } = [];

    public List<int> DeletedIds { get; } = [];

    public List<TaskItem> Changed { get; } = [];

    public List<(TaskItem Task, string Action, string? Detail)> History { get; } = [];

    #region Public Methods

    public TaskChangesDto ToDto()
    {
        return new TaskChangesDto { DeletedIds = DeletedIds, Tasks = Changed.Concat(Added).Distinct().Where(t => !DeletedIds.Contains(t.Id)).Select(TaskMapper.ToDto).ToList() };
    }

    public void Log(TaskItem task, string action, string? detail = null)
    {
        History.Add((task, action, detail));
    }

    #endregion
}
