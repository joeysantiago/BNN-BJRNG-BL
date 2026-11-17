using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Tasks;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

// Shares are read only through a live task: a deleted task disappears from Shared with me and comes back when it is restored.
public class TaskShareRepository : ITaskShareRepository
{
    private readonly ICommonDbContext _dbContext;

    public TaskShareRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddAsync(TaskShare share, CancellationToken cancellationToken)
    {
        _dbContext.TaskShares.Add(share);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    // Administrators open every app; everyone else needs the Tasks app ticked for them.
    public async Task<bool> HasTasksAppAsync(int accountUserId, CancellationToken cancellationToken)
    {
        if (await _dbContext.UserAppAccess.WhereActive().AnyAsync(a => a.UserId == accountUserId && _dbContext.Apps.WhereActive().Any(app => app.Id == a.AppId && app.Code == AppCodes.Tasks), cancellationToken))
            return true;

        return await _dbContext.Users.WhereActive().AnyAsync(u => u.Id == accountUserId && _dbContext.Roles.Any(r => r.Id == u.RoleId && (r.Code == RoleCodes.Admin || r.Code == RoleCodes.SuperAdmin)), cancellationToken);
    }

    // A share of the caller (the account it is shared with), whatever its status, through a live task.
    public Task<TaskShare?> GetAsync(int shareId, int accountUserId, CancellationToken cancellationToken)
    {
        return Live().FirstOrDefaultAsync(s => s.Id == shareId && s.UserId == accountUserId, cancellationToken);
    }

    // An active account by its e-mail address or by the mobile number of its profile (both already normalised).
    public Task<User?> FindAccountAsync(string? email, string? mobile, CancellationToken cancellationToken)
    {
        var users = _dbContext.Users.AsNoTracking().WhereActive();

        return email is not null ? users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken) : users.FirstOrDefaultAsync(u => _dbContext.UserProfiles.WhereActive().Any(p => p.UserId == u.Id && p.Mobile == mobile), cancellationToken);
    }

    // A share of a task the caller owns (TaskUsers.Id), through a live task.
    public Task<TaskShare?> GetOwnedAsync(int shareId, int ownerUserId, CancellationToken cancellationToken)
    {
        return Live().FirstOrDefaultAsync(s => s.Id == shareId && _dbContext.TaskItems.Any(t => t.Id == s.TaskId && t.UserId == ownerUserId), cancellationToken);
    }

    // The row of one task and one account, removed ones too, so sharing again with the same person reuses it (TaskId + UserId is unique).
    public Task<TaskShare?> GetByTaskAsync(int taskId, int accountUserId, CancellationToken cancellationToken)
    {
        return _dbContext.TaskShares.FirstOrDefaultAsync(s => s.TaskId == taskId && s.UserId == accountUserId && s.IsActive && !s.IsDeleted, cancellationToken);
    }

    public async Task<List<(TaskShare Share, string Name)>> GetSharesAsync(int taskId, CancellationToken cancellationToken)
    {
        var rows = await _dbContext.TaskShares.AsNoTracking().WhereActive().Where(s => s.TaskId == taskId).Join(_dbContext.Users, s => s.UserId, u => u.Id, (s, u) => new { Share = s, u.DisplayName }).OrderBy(r => r.Share.Id).ToListAsync(cancellationToken);

        return rows.Select(r => (r.Share, r.DisplayName)).ToList();
    }

    // Pending and accepted shares of the caller with their live tasks (checklist and pictures) and the name of the owner. Declined ones are left out.
    public async Task<List<(TaskShare Share, TaskItem Task, string OwnerName)>> GetIncomingAsync(int accountUserId, CancellationToken cancellationToken)
    {
        var shares = await _dbContext.TaskShares.AsNoTracking().WhereActive().Where(s => s.UserId == accountUserId && s.Status != TaskShareStatuses.Declined).ToListAsync(cancellationToken);
        var taskIds = shares.Select(s => s.TaskId).ToList();
        var tasks = await _dbContext.TaskItems.AsNoTracking().WhereActive().Where(t => taskIds.Contains(t.Id)).Include(t => t.ChecklistItems.Where(c => c.IsActive && !c.IsSoftDeleted && !c.IsDeleted).OrderBy(c => c.SortOrder).ThenBy(c => c.Id)).Include(t => t.Attachments.Where(a => a.IsActive && !a.IsSoftDeleted && !a.IsDeleted).OrderBy(a => a.SortOrder).ThenBy(a => a.Id)).AsSplitQuery().ToListAsync(cancellationToken);
        var ownerIds = tasks.Select(t => t.UserId).Distinct().ToList();
        var owners = await _dbContext.TaskUsers.AsNoTracking().Where(o => ownerIds.Contains(o.Id)).Join(_dbContext.Users, o => o.UserId, u => u.Id, (o, u) => new { o.Id, u.DisplayName }).ToDictionaryAsync(o => o.Id, o => o.DisplayName, cancellationToken);
        var byId = tasks.ToDictionary(t => t.Id);

        return shares.Where(s => byId.ContainsKey(s.TaskId)).OrderByDescending(s => s.CreatedOn).Select(s => (s, byId[s.TaskId], owners.GetValueOrDefault(byId[s.TaskId].UserId) ?? string.Empty)).ToList();
    }

    #endregion

    #region Private Methods

    private IQueryable<TaskShare> Live()
    {
        return _dbContext.TaskShares.WhereActive().Where(s => _dbContext.TaskItems.WhereActive().Any(t => t.Id == s.TaskId));
    }

    #endregion
}
