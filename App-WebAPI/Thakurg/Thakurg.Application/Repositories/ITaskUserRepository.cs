using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

// The My Tasks profile of an account, its App Lock sessions, and the name of the app (the "tasks" rows of PageNames).
public interface ITaskUserRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task<TaskUser?> GetAsync(int userId, CancellationToken cancellationToken);

    Task AddLockSessionAsync(TaskLockSession session, CancellationToken cancellationToken);

    Task<List<PageName>> GetPageNamesAsync(string code, CancellationToken cancellationToken);

    Task AddPageNamesAsync(IEnumerable<PageName> names, CancellationToken cancellationToken);

    Task<TaskUser?> FindByAccountAsync(int accountUserId, CancellationToken cancellationToken);

    Task<TaskLockSession?> GetLockSessionAsync(int sessionId, CancellationToken cancellationToken);

    Task<List<string>> DeleteAllAsync(int userId, int accountUserId, string appCode, CancellationToken cancellationToken);

    Task<bool> TryAddAsync(TaskUser user, List<TaskCategory> categories, string defaultCode, CancellationToken cancellationToken);
}
