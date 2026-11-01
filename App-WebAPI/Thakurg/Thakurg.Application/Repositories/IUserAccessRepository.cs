using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IUserAccessRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task<int> CountAdminsAsync(CancellationToken cancellationToken);

    Task<List<App>> GetAppsAsync(CancellationToken cancellationToken);

    Task<List<User>> GetUsersAsync(CancellationToken cancellationToken);

    Task<User?> GetUserAsync(int userId, CancellationToken cancellationToken);

    Task<List<UserAppAccess>> GetAccessAsync(CancellationToken cancellationToken);

    Task ReplaceAccessAsync(int userId, IReadOnlyCollection<int> appIds, CancellationToken cancellationToken);
}
