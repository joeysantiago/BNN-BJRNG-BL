using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

// The Roles and Role rights tabs of the Settings page: roles, the pages rights are given for, and each role's rights.
public class RoleRepository : IRoleRepository
{
    private readonly ICommonDbContext _dbContext;

    public RoleRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public void AddRole(Role role)
    {
        _dbContext.Roles.Add(role);
    }

    public void AddPermission(RolePermission permission)
    {
        _dbContext.RolePermissions.Add(permission);
    }

    public void RemovePermission(RolePermission permission)
    {
        _dbContext.RolePermissions.Remove(permission);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<List<Page>> GetPagesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Pages.AsNoTracking().WhereActive().OrderBy(p => p.SortOrder).ToListAsync(cancellationToken);
    }

    public Task<List<Role>> GetRolesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Roles.AsNoTracking().WhereActive().OrderBy(r => r.SortOrder).ThenBy(r => r.Name).ToListAsync(cancellationToken);
    }

    public Task<Page?> GetPageAsync(int pageId, CancellationToken cancellationToken)
    {
        return _dbContext.Pages.AsNoTracking().WhereActive().FirstOrDefaultAsync(p => p.Id == pageId, cancellationToken);
    }

    public Task<Role?> GetRoleAsync(int roleId, CancellationToken cancellationToken)
    {
        return _dbContext.Roles.WhereActive().FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);
    }

    // Active users per role id.
    public Task<Dictionary<int, int>> CountUsersAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Users.AsNoTracking().WhereActive().GroupBy(u => u.RoleId).ToDictionaryAsync(g => g.Key, g => g.Count(), cancellationToken);
    }

    public Task<int> CountUsersInRoleAsync(int roleId, CancellationToken cancellationToken)
    {
        return _dbContext.Users.WhereActive().CountAsync(u => u.RoleId == roleId, cancellationToken);
    }

    // Only one role is the sign-up role: the others lose the mark. Saved by SaveChangesAsync.
    public async Task ClearDefaultAsync(int exceptRoleId, CancellationToken cancellationToken)
    {
        var defaults = await _dbContext.Roles.Where(r => r.IsDefault && r.Id != exceptRoleId).ToListAsync(cancellationToken);

        defaults.ForEach(r => r.IsDefault = false);
    }

    public Task<List<int>> GetUserIdsInRoleAsync(int roleId, CancellationToken cancellationToken)
    {
        return _dbContext.Users.AsNoTracking().WhereActive().Where(u => u.RoleId == roleId).Select(u => u.Id).ToListAsync(cancellationToken);
    }

    // A deleted role takes its rights with it. Saved by SaveChangesAsync.
    public async Task RemovePermissionsOfRoleAsync(int roleId, CancellationToken cancellationToken)
    {
        var rows = await _dbContext.RolePermissions.Where(p => p.RoleId == roleId).ToListAsync(cancellationToken);

        _dbContext.RolePermissions.RemoveRange(rows);
    }

    public Task<bool> PermissionExistsAsync(int roleId, int pageId, CancellationToken cancellationToken)
    {
        return _dbContext.RolePermissions.AsNoTracking().AnyAsync(p => p.RoleId == roleId && p.PageId == pageId, cancellationToken);
    }

    // Deleted roles count too: the code stays unique in the Roles table.
    public Task<bool> CodeExistsAsync(string code, int exceptRoleId, CancellationToken cancellationToken)
    {
        return _dbContext.Roles.AsNoTracking().AnyAsync(r => r.Code == code && r.Id != exceptRoleId, cancellationToken);
    }

    public Task<RolePermission?> GetPermissionAsync(int permissionId, CancellationToken cancellationToken)
    {
        return _dbContext.RolePermissions.WhereActive().FirstOrDefaultAsync(p => p.Id == permissionId, cancellationToken);
    }

    public Task<List<RolePermission>> GetPermissionsAsync(int roleId, CancellationToken cancellationToken)
    {
        return _dbContext.RolePermissions.AsNoTracking().WhereActive().Where(p => p.RoleId == roleId).ToListAsync(cancellationToken);
    }

    #endregion
}
