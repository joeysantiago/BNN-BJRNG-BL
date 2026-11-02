using Thakurg.Contracts.Auth;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IAuthRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task AddUserAsync(User user, CancellationToken cancellationToken);

    Task<Role?> GetDefaultRoleAsync(CancellationToken cancellationToken);

    Task<List<App>> GetAllAppsAsync(CancellationToken cancellationToken);

    Task<List<Feature>> GetFeaturesAsync(CancellationToken cancellationToken);

    Task<Role?> GetRoleAsync(int roleId, CancellationToken cancellationToken);

    Task<User?> GetUserAsync(int userId, CancellationToken cancellationToken);

    Task<List<App>> GetAutoGrantAppsAsync(CancellationToken cancellationToken);

    Task AddSessionAsync(UserSession session, CancellationToken cancellationToken);

    Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken);

    Task<Role?> GetRoleByCodeAsync(string code, CancellationToken cancellationToken);

    Task<List<string>> GetAppCodesAsync(int userId, CancellationToken cancellationToken);

    Task<UserSession?> GetSessionAsync(int sessionId, CancellationToken cancellationToken);

    Task<List<string>> GetHiddenFeaturesAsync(int userId, CancellationToken cancellationToken);

    Task AddAccessAsync(IEnumerable<UserAppAccess> access, CancellationToken cancellationToken);

    Task<List<RolePermissionRow>> GetPermissionsAsync(int roleId, CancellationToken cancellationToken);

    Task<UserSession?> GetSessionByTokenAsync(string refreshTokenHash, CancellationToken cancellationToken);

    Task<bool> IsSessionActiveAsync(int sessionId, int userId, DateTime now, CancellationToken cancellationToken);

    Task RevokeSessionsAsync(int userId, int? exceptSessionId, DateTime now, CancellationToken cancellationToken);

    Task ReplaceHiddenFeaturesAsync(int userId, IReadOnlyCollection<int> featureIds, CancellationToken cancellationToken);
}
