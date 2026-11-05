using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

// The tasks of one user (TaskUsers.Id), with their checklist lines, pictures, history and categories. Every read is limited to that user.
public interface ITaskRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task AddTaskAsync(TaskItem task, CancellationToken cancellationToken);

    Task<int> CountCategoriesAsync(int userId, CancellationToken cancellationToken);

    Task AddCategoryAsync(TaskCategory category, CancellationToken cancellationToken);

    Task<List<TaskItem>> GetTasksAsync(int userId, CancellationToken cancellationToken);

    Task<List<TaskItem>> GetDeletedAsync(int userId, CancellationToken cancellationToken);

    Task<TaskItem?> GetTaskAsync(int userId, int taskId, CancellationToken cancellationToken);

    Task AddHistoryAsync(IEnumerable<TaskHistory> history, CancellationToken cancellationToken);

    Task<List<TaskCategory>> GetCategoriesAsync(int userId, CancellationToken cancellationToken);

    Task<Dictionary<int, int>> CountByCategoryAsync(int userId, CancellationToken cancellationToken);

    Task<List<TaskHistory>> GetHistoryAsync(int userId, int taskId, CancellationToken cancellationToken);

    Task<TaskCategory?> GetCategoryAsync(int userId, int categoryId, CancellationToken cancellationToken);

    Task ClearCategoryAsync(int userId, int categoryId, DateTime now, CancellationToken cancellationToken);

    Task<TaskItem?> GetTaskAsync(int userId, int taskId, bool deleted, CancellationToken cancellationToken);

    Task<TaskAttachment?> GetAttachmentAsync(int userId, int attachmentId, CancellationToken cancellationToken);

    Task<List<TaskItem>> GetTasksAsync(int userId, IReadOnlyCollection<int> taskIds, CancellationToken cancellationToken);
}
