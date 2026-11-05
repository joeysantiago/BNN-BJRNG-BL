using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

// Every query is limited to the tasks of one user. Checklist lines and pictures are loaded with the task (only the live ones, in order).
public class TaskRepository : ITaskRepository
{
    private readonly ICommonDbContext _dbContext;

    public TaskRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddTaskAsync(TaskItem task, CancellationToken cancellationToken)
    {
        _dbContext.TaskItems.Add(task);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<int> CountCategoriesAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.TaskCategories.WhereActive().CountAsync(c => c.UserId == userId, cancellationToken);
    }

    public Task<List<TaskItem>> GetTasksAsync(int userId, CancellationToken cancellationToken)
    {
        return WithDetails(_dbContext.TaskItems.AsNoTracking().WhereActive().Where(t => t.UserId == userId)).OrderBy(t => t.Id).ToListAsync(cancellationToken);
    }

    public Task<List<TaskItem>> GetDeletedAsync(int userId, CancellationToken cancellationToken)
    {
        return WithDetails(_dbContext.TaskItems.AsNoTracking().Where(t => t.UserId == userId && t.IsActive && t.IsSoftDeleted && !t.IsDeleted)).OrderByDescending(t => t.DeletedOn).ToListAsync(cancellationToken);
    }

    public async Task AddCategoryAsync(TaskCategory category, CancellationToken cancellationToken)
    {
        _dbContext.TaskCategories.Add(category);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<TaskItem?> GetTaskAsync(int userId, int taskId, CancellationToken cancellationToken)
    {
        return GetTaskAsync(userId, taskId, false, cancellationToken);
    }

    public Task<List<TaskCategory>> GetCategoriesAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.TaskCategories.WhereActive().Where(c => c.UserId == userId).OrderBy(c => c.SortOrder).ThenBy(c => c.Id).ToListAsync(cancellationToken);
    }

    public Task<Dictionary<int, int>> CountByCategoryAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.TaskItems.AsNoTracking().WhereActive().Where(t => t.UserId == userId && t.CategoryId != null).GroupBy(t => t.CategoryId!.Value).ToDictionaryAsync(g => g.Key, g => g.Count(), cancellationToken);
    }

    public async Task AddHistoryAsync(IEnumerable<TaskHistory> history, CancellationToken cancellationToken)
    {
        _dbContext.TaskHistory.AddRange(history);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<List<TaskHistory>> GetHistoryAsync(int userId, int taskId, CancellationToken cancellationToken)
    {
        return _dbContext.TaskHistory.AsNoTracking().WhereActive().Where(h => h.TaskId == taskId && _dbContext.TaskItems.Any(t => t.Id == taskId && t.UserId == userId)).OrderByDescending(h => h.Id).ToListAsync(cancellationToken);
    }

    public Task<TaskCategory?> GetCategoryAsync(int userId, int categoryId, CancellationToken cancellationToken)
    {
        return _dbContext.TaskCategories.WhereActive().FirstOrDefaultAsync(c => c.UserId == userId && c.Id == categoryId, cancellationToken);
    }

    public Task<TaskItem?> GetTaskAsync(int userId, int taskId, bool deleted, CancellationToken cancellationToken)
    {
        return WithDetails(_dbContext.TaskItems.Where(t => t.Id == taskId && t.UserId == userId && t.IsActive && !t.IsDeleted && t.IsSoftDeleted == deleted)).FirstOrDefaultAsync(cancellationToken);
    }

    // A picture is found only through a live task of the same user, so nobody can open another user's pictures by guessing ids.
    public Task<TaskAttachment?> GetAttachmentAsync(int userId, int attachmentId, CancellationToken cancellationToken)
    {
        return _dbContext.TaskAttachments.WhereActive().Where(a => a.Id == attachmentId && _dbContext.TaskItems.WhereActive().Any(t => t.Id == a.TaskId && t.UserId == userId)).FirstOrDefaultAsync(cancellationToken);
    }

    // The tasks of a deleted category keep living without a category (deleted tasks too, so a restore finds no dangling category).
    public async Task ClearCategoryAsync(int userId, int categoryId, DateTime now, CancellationToken cancellationToken)
    {
        await _dbContext.TaskItems.Where(t => t.UserId == userId && t.CategoryId == categoryId).ExecuteUpdateAsync(s => s.SetProperty(t => t.CategoryId, (int?)null).SetProperty(t => t.ModifiedOn, now), cancellationToken);
    }

    public Task<List<TaskItem>> GetTasksAsync(int userId, IReadOnlyCollection<int> taskIds, CancellationToken cancellationToken)
    {
        return WithDetails(_dbContext.TaskItems.WhereActive().Where(t => t.UserId == userId && taskIds.Contains(t.Id))).ToListAsync(cancellationToken);
    }

    #endregion

    #region Private Methods

    private static IQueryable<TaskItem> WithDetails(IQueryable<TaskItem> query)
    {
        return query.Include(t => t.ChecklistItems.Where(c => c.IsActive && !c.IsSoftDeleted && !c.IsDeleted).OrderBy(c => c.SortOrder).ThenBy(c => c.Id)).Include(t => t.Attachments.Where(a => a.IsActive && !a.IsSoftDeleted && !a.IsDeleted).OrderBy(a => a.SortOrder).ThenBy(a => a.Id)).AsSplitQuery();
    }

    #endregion
}
