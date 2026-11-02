using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class UserAccessRepository : IUserAccessRepository
{
    private readonly ICommonDbContext _dbContext;

    public UserAccessRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<List<App>> GetAppsAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Apps.AsNoTracking().WhereActive().OrderBy(a => a.SortOrder).ToListAsync(cancellationToken);
    }

    public Task<List<Role>> GetRolesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Roles.AsNoTracking().WhereActive().OrderBy(r => r.SortOrder).ThenBy(r => r.Name).ToListAsync(cancellationToken);
    }

    public Task<List<User>> GetUsersAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Users.AsNoTracking().WhereActive().OrderBy(u => u.Email).ToListAsync(cancellationToken);
    }

    public async Task AddUserAsync(User user, CancellationToken cancellationToken)
    {
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<Role?> GetRoleAsync(int roleId, CancellationToken cancellationToken)
    {
        return _dbContext.Roles.AsNoTracking().WhereActive().FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);
    }

    public Task<User?> GetUserAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.Users.WhereActive().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    public Task<List<UserAppAccess>> GetAccessAsync(CancellationToken cancellationToken)
    {
        return _dbContext.UserAppAccess.AsNoTracking().WhereActive().ToListAsync(cancellationToken);
    }

    // Deleted accounts count too: the e-mail stays unique in the Users table.
    public Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken)
    {
        return _dbContext.Users.AsNoTracking().AnyAsync(u => u.Email == email, cancellationToken);
    }

    public Task<int> CountUsersInRoleAsync(int roleId, CancellationToken cancellationToken)
    {
        return _dbContext.Users.WhereActive().CountAsync(u => u.RoleId == roleId, cancellationToken);
    }

    // A deleted account is logged out on every device at once.
    public Task RevokeSessionsAsync(int userId, DateTime now, CancellationToken cancellationToken)
    {
        return _dbContext.UserSessions.Where(s => s.UserId == userId && s.RevokedOn == null).ExecuteUpdateAsync(u => u.SetProperty(s => s.RevokedOn, now).SetProperty(s => s.ModifiedOn, now), cancellationToken);
    }

    // The user's access rows become exactly appIds: rows no longer ticked are deleted, new ticks are added. Saved by SaveChangesAsync.
    public async Task ReplaceAccessAsync(int userId, IReadOnlyCollection<int> appIds, CancellationToken cancellationToken)
    {
        var current = await _dbContext.UserAppAccess.Where(a => a.UserId == userId).ToListAsync(cancellationToken);

        _dbContext.UserAppAccess.RemoveRange(current.Where(a => !appIds.Contains(a.AppId)));
        _dbContext.UserAppAccess.AddRange(appIds.Where(id => current.All(a => a.AppId != id)).Select(id => new UserAppAccess { UserId = userId, AppId = id }));
    }

    #endregion
}
