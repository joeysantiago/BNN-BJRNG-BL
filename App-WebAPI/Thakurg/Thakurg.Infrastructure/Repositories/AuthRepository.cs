using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Contracts.Auth;
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

    // The role a self sign-up gets (Roles.IsDefault).
    public Task<Role?> GetDefaultRoleAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Roles.AsNoTracking().WhereActive().OrderBy(r => r.SortOrder).FirstOrDefaultAsync(r => r.IsDefault, cancellationToken);
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

    public Task<List<Feature>> GetFeaturesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Features.AsNoTracking().WhereActive().ToListAsync(cancellationToken);
    }

    public Task<Role?> GetRoleAsync(int roleId, CancellationToken cancellationToken)
    {
        return _dbContext.Roles.AsNoTracking().WhereActive().FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);
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

    public Task<Role?> GetRoleByCodeAsync(string code, CancellationToken cancellationToken)
    {
        return _dbContext.Roles.AsNoTracking().WhereActive().FirstOrDefaultAsync(r => r.Code == code, cancellationToken);
    }

    // The account whose profile (UserProfiles) holds this mobile number, in E.164 form.
    public Task<User?> FindByMobileAsync(string mobile, CancellationToken cancellationToken)
    {
        var profiles = _dbContext.UserProfiles.WhereActive();

        return _dbContext.Users.WhereActive().FirstOrDefaultAsync(u => profiles.Any(p => p.UserId == u.Id && p.Mobile == mobile), cancellationToken);
    }

    public async Task AddSessionAsync(UserSession session, CancellationToken cancellationToken)
    {
        _dbContext.UserSessions.Add(session);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddProfileAsync(UserProfile profile, CancellationToken cancellationToken)
    {
        _dbContext.UserProfiles.Add(profile);
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

    // Codes of the options the user switched off for themselves.
    public Task<List<string>> GetHiddenFeaturesAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.UserFeatures.AsNoTracking().WhereActive().Where(f => f.UserId == userId && !f.IsEnabled).Join(_dbContext.Features.WhereActive(), f => f.FeatureId, feature => feature.Id, (_, feature) => feature.Code).ToListAsync(cancellationToken);
    }

    public async Task AddAccessAsync(IEnumerable<UserAppAccess> access, CancellationToken cancellationToken)
    {
        _dbContext.UserAppAccess.AddRange(access);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    // The role's rights on the active pages, with each page's code.
    public Task<List<RolePermissionRow>> GetPermissionsAsync(int roleId, CancellationToken cancellationToken)
    {
        return _dbContext.RolePermissions.AsNoTracking().WhereActive().Where(p => p.RoleId == roleId).Join(_dbContext.Pages.WhereActive(), p => p.PageId, page => page.Id, (p, page) => new RolePermissionRow { PageCode = page.Code, CanView = p.CanView, CanAdd = p.CanAdd, CanEdit = p.CanEdit, CanDelete = p.CanDelete }).ToListAsync(cancellationToken);
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

    // The user's hidden options become exactly featureIds: rows no longer hidden are deleted, new ones are added. Saved by SaveChangesAsync.
    public async Task ReplaceHiddenFeaturesAsync(int userId, IReadOnlyCollection<int> featureIds, CancellationToken cancellationToken)
    {
        var current = await _dbContext.UserFeatures.Where(f => f.UserId == userId).ToListAsync(cancellationToken);

        _dbContext.UserFeatures.RemoveRange(current.Where(f => !featureIds.Contains(f.FeatureId)));
        _dbContext.UserFeatures.AddRange(featureIds.Where(id => current.All(f => f.FeatureId != id)).Select(id => new UserFeature { UserId = userId, FeatureId = id, IsEnabled = false, CreatedBy = userId }));
    }

    #endregion
}
