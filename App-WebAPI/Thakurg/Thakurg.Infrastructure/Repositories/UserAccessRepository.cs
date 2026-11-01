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

    public Task<int> CountAdminsAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Users.WhereActive().CountAsync(u => u.IsAdmin, cancellationToken);
    }

    public Task<List<App>> GetAppsAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Apps.AsNoTracking().WhereActive().OrderBy(a => a.SortOrder).ToListAsync(cancellationToken);
    }

    public Task<List<User>> GetUsersAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Users.AsNoTracking().WhereActive().OrderBy(u => u.Email).ToListAsync(cancellationToken);
    }

    public Task<User?> GetUserAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.Users.WhereActive().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    public Task<List<UserAppAccess>> GetAccessAsync(CancellationToken cancellationToken)
    {
        return _dbContext.UserAppAccess.AsNoTracking().WhereActive().ToListAsync(cancellationToken);
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
