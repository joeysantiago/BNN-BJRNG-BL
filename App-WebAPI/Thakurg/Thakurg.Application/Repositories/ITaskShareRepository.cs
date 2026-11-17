using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

// The shares of tasks (TaskShares) and the accounts they point at. The owner side is found through the task (TaskItems.UserId = TaskUsers.Id); the other side is an account (Users.Id).
public interface ITaskShareRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task AddAsync(TaskShare share, CancellationToken cancellationToken);

    Task<bool> HasTasksAppAsync(int accountUserId, CancellationToken cancellationToken);

    Task<TaskShare?> GetAsync(int shareId, int accountUserId, CancellationToken cancellationToken);

    Task<User?> FindAccountAsync(string? email, string? mobile, CancellationToken cancellationToken);

    Task<TaskShare?> GetOwnedAsync(int shareId, int ownerUserId, CancellationToken cancellationToken);

    Task<TaskShare?> GetByTaskAsync(int taskId, int accountUserId, CancellationToken cancellationToken);

    Task<List<(TaskShare Share, string Name)>> GetSharesAsync(int taskId, CancellationToken cancellationToken);

    Task<List<(TaskShare Share, TaskItem Task, string OwnerName)>> GetIncomingAsync(int accountUserId, CancellationToken cancellationToken);
}
