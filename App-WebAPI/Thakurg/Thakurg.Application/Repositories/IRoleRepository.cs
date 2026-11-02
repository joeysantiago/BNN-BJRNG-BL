using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IRoleRepository
{
    void AddRole(Role role);

    void AddPermission(RolePermission permission);

    void RemovePermission(RolePermission permission);

    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task<List<Page>> GetPagesAsync(CancellationToken cancellationToken);

    Task<List<Role>> GetRolesAsync(CancellationToken cancellationToken);

    Task<Page?> GetPageAsync(int pageId, CancellationToken cancellationToken);

    Task<Role?> GetRoleAsync(int roleId, CancellationToken cancellationToken);

    Task ClearDefaultAsync(int exceptRoleId, CancellationToken cancellationToken);

    Task<Dictionary<int, int>> CountUsersAsync(CancellationToken cancellationToken);

    Task<int> CountUsersInRoleAsync(int roleId, CancellationToken cancellationToken);

    Task RemovePermissionsOfRoleAsync(int roleId, CancellationToken cancellationToken);

    Task<List<int>> GetUserIdsInRoleAsync(int roleId, CancellationToken cancellationToken);

    Task<bool> PermissionExistsAsync(int roleId, int pageId, CancellationToken cancellationToken);

    Task<bool> CodeExistsAsync(string code, int exceptRoleId, CancellationToken cancellationToken);

    Task<RolePermission?> GetPermissionAsync(int permissionId, CancellationToken cancellationToken);

    Task<List<RolePermission>> GetPermissionsAsync(int roleId, CancellationToken cancellationToken);
}
