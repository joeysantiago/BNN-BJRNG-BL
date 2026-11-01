using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class AuthRepository : IAuthRepository
{
    private readonly ICommonDbContext _dbContext;

    public AuthRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<List<App>> GetAllAppsAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Apps.AsNoTracking().WhereActive().ToListAsync(cancellationToken);
    }

    public async Task AddUserAsync(User user, CancellationToken cancellationToken)
    {
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<User?> GetUserAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.Users.WhereActive().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    public Task<List<App>> GetAutoGrantAppsAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Apps.AsNoTracking().WhereActive().Where(a => a.AutoGrant).ToListAsync(cancellationToken);
    }

    public Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken)
    {
        return _dbContext.Users.WhereActive().FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
    }

    public async Task AddSessionAsync(UserSession session, CancellationToken cancellationToken)
    {
        _dbContext.UserSessions.Add(session);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    // Codes of the active apps the user may open, in the order of the Apps table.
    public Task<List<string>> GetAppCodesAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.UserAppAccess.AsNoTracking().WhereActive().Where(a => a.UserId == userId).Join(_dbContext.Apps.WhereActive(), a => a.AppId, app => app.Id, (_, app) => app).OrderBy(app => app.SortOrder).Select(app => app.Code).ToListAsync(cancellationToken);
    }

    public Task<UserSession?> GetSessionAsync(int sessionId, CancellationToken cancellationToken)
    {
        return _dbContext.UserSessions.WhereActive().FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);
    }

    public async Task AddAccessAsync(IEnumerable<UserAppAccess> access, CancellationToken cancellationToken)
    {
        _dbContext.UserAppAccess.AddRange(access);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<UserSession?> GetSessionByTokenAsync(string refreshTokenHash, CancellationToken cancellationToken)
    {
        return _dbContext.UserSessions.WhereActive().FirstOrDefaultAsync(s => s.RefreshTokenHash == refreshTokenHash, cancellationToken);
    }

    public Task<bool> IsSessionActiveAsync(int sessionId, int userId, DateTime now, CancellationToken cancellationToken)
    {
        return _dbContext.UserSessions.AsNoTracking().WhereActive().AnyAsync(s => s.Id == sessionId && s.UserId == userId && s.RevokedOn == null && s.ExpiresOn > now, cancellationToken);
    }

    public Task RevokeSessionsAsync(int userId, int? exceptSessionId, DateTime now, CancellationToken cancellationToken)
    {
        return _dbContext.UserSessions.Where(s => s.UserId == userId && s.RevokedOn == null && (exceptSessionId == null || s.Id != exceptSessionId)).ExecuteUpdateAsync(u => u.SetProperty(s => s.RevokedOn, now).SetProperty(s => s.ModifiedOn, now), cancellationToken);
    }

    #endregion
}
