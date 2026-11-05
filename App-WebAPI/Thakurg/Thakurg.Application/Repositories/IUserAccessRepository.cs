using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IUserAccessRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task<List<App>> GetAppsAsync(CancellationToken cancellationToken);

    Task AddUserAsync(User user, CancellationToken cancellationToken);

    Task<List<Role>> GetRolesAsync(CancellationToken cancellationToken);

    Task<Role?> GetRoleAsync(int roleId, CancellationToken cancellationToken);

    Task<User?> GetUserAsync(int userId, CancellationToken cancellationToken);

    Task<List<UserAppAccess>> GetAccessAsync(CancellationToken cancellationToken);

    Task<List<User>> GetQuickLoginUsersAsync(CancellationToken cancellationToken);

    Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken);

    Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken);

    Task<User?> GetDeletedUserAsync(int userId, CancellationToken cancellationToken);

    Task<int> CountUsersInRoleAsync(int roleId, CancellationToken cancellationToken);

    Task<List<User>> GetUsersAsync(string? status, CancellationToken cancellationToken);

    Task RevokeSessionsAsync(int userId, DateTime now, CancellationToken cancellationToken);

    Task ReplaceAccessAsync(int userId, IReadOnlyCollection<int> appIds, CancellationToken cancellationToken);
}
