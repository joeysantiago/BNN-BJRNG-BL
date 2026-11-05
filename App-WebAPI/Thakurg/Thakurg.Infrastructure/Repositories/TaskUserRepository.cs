using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class TaskUserRepository : ITaskUserRepository
{
    private readonly ICommonDbContext _dbContext;

    public TaskUserRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<TaskUser?> GetAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.TaskUsers.WhereActive().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    public Task<List<PageName>> GetPageNamesAsync(string code, CancellationToken cancellationToken)
    {
        return _dbContext.PageNames.WhereActive().Where(p => p.PageCode == code).ToListAsync(cancellationToken);
    }

    public Task<TaskUser?> FindByAccountAsync(int accountUserId, CancellationToken cancellationToken)
    {
        return _dbContext.TaskUsers.AsNoTracking().WhereActive().FirstOrDefaultAsync(u => u.UserId == accountUserId, cancellationToken);
    }

    public async Task AddLockSessionAsync(TaskLockSession session, CancellationToken cancellationToken)
    {
        _dbContext.TaskLockSessions.Add(session);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddPageNamesAsync(IEnumerable<PageName> names, CancellationToken cancellationToken)
    {
        _dbContext.PageNames.AddRange(names);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<TaskLockSession?> GetLockSessionAsync(int sessionId, CancellationToken cancellationToken)
    {
        return _dbContext.TaskLockSessions.WhereActive().FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);
    }

    // Removes everything of one user in My Tasks for good (tasks, checklists, pictures, history, reminders, categories, lock sessions, the profile) and the
    // access of the account to the app, in one transaction. Returns the picture files to delete from the store.
    public async Task<List<string>> DeleteAllAsync(int userId, int accountUserId, string appCode, CancellationToken cancellationToken)
    {
        var strategy = _dbContext.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
            var tasks = _dbContext.TaskItems.Where(t => t.UserId == userId).Select(t => t.Id);
            var files = await _dbContext.TaskAttachments.Where(a => tasks.Contains(a.TaskId)).Select(a => a.FileId).ToListAsync(cancellationToken);
            await _dbContext.TaskReminderLogs.Where(l => tasks.Contains(l.TaskId)).ExecuteDeleteAsync(cancellationToken);
            await _dbContext.TaskHistory.Where(h => tasks.Contains(h.TaskId)).ExecuteDeleteAsync(cancellationToken);
            await _dbContext.TaskAttachments.Where(a => tasks.Contains(a.TaskId)).ExecuteDeleteAsync(cancellationToken);
            await _dbContext.TaskChecklistItems.Where(c => tasks.Contains(c.TaskId)).ExecuteDeleteAsync(cancellationToken);
            await _dbContext.TaskItems.Where(t => t.UserId == userId).ExecuteDeleteAsync(cancellationToken);
            await _dbContext.TaskLockSessions.Where(s => s.UserId == userId).ExecuteDeleteAsync(cancellationToken);
            await _dbContext.TaskCategories.Where(c => c.UserId == userId).ExecuteDeleteAsync(cancellationToken);
            await _dbContext.TaskUsers.Where(u => u.Id == userId).ExecuteDeleteAsync(cancellationToken);
            await _dbContext.UserAppAccess.Where(a => a.UserId == accountUserId && _dbContext.Apps.Any(app => app.Id == a.AppId && app.Code == appCode)).ExecuteDeleteAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return files;
        });
    }

    // The profile and its starting categories in one transaction. False when a parallel request made the profile first (the unique UserId index refuses the second).
    public async Task<bool> TryAddAsync(TaskUser user, List<TaskCategory> categories, string defaultCode, CancellationToken cancellationToken)
    {
        var strategy = _dbContext.Database.CreateExecutionStrategy();

        try
        {
            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
                _dbContext.TaskUsers.Add(user);
                await _dbContext.SaveChangesAsync(cancellationToken);
                categories.ForEach(c => c.UserId = user.Id);
                _dbContext.TaskCategories.AddRange(categories);
                await _dbContext.SaveChangesAsync(cancellationToken);
                user.DefaultCategoryId = categories.FirstOrDefault(c => c.Code == defaultCode)?.Id;
                await _dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            });

            return true;
        }
        catch (DbUpdateException)
        {
            _dbContext.Entry(user).State = EntityState.Detached;
            categories.ForEach(c => _dbContext.Entry(c).State = EntityState.Detached);

            return false;
        }
    }

    #endregion
}
