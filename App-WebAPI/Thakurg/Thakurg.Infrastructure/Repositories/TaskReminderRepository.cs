using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Tasks;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class TaskReminderRepository : ITaskReminderRepository
{
    private readonly ICommonDbContext _dbContext;

    public TaskReminderRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public async Task AddLogAsync(TaskReminderLog log, CancellationToken cancellationToken)
    {
        _dbContext.TaskReminderLogs.Add(log);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    // The name of the app per language (PageNames), for the reminder text.
    public Task<Dictionary<string, string>> GetAppNamesAsync(string appCode, CancellationToken cancellationToken)
    {
        return _dbContext.PageNames.AsNoTracking().WhereActive().Where(p => p.PageCode == appCode).ToDictionaryAsync(p => p.LanguageCode, p => p.Name, cancellationToken);
    }

    // Users with notifications and WhatsApp reminders on, a mobile number in their profile, and access to the app (or an administrator role).
    public Task<List<TaskReminderRecipientDto>> GetRecipientsAsync(string appCode, CancellationToken cancellationToken)
    {
        var admins = new[] { RoleCodes.SuperAdmin, RoleCodes.Admin };
        var query = from t in _dbContext.TaskUsers.WhereActive()
                    join u in _dbContext.Users.WhereActive() on t.UserId equals u.Id
                    join p in _dbContext.UserProfiles.WhereActive() on u.Id equals p.UserId
                    join r in _dbContext.Roles on u.RoleId equals r.Id
                    where t.NotificationsEnabled && t.WhatsAppReminders && p.Mobile != null
                    where admins.Contains(r.Code) || _dbContext.UserAppAccess.WhereActive().Any(a => a.UserId == u.Id && _dbContext.Apps.WhereActive().Any(app => app.Id == a.AppId && app.Code == appCode))
                    select new TaskReminderRecipientDto { UserId = t.Id, Mobile = p.Mobile!, Language = u.Language, TimeZone = t.TimeZone, ReminderTime = t.ReminderTime, RemindBefore = t.RemindBefore, OverdueReminders = t.OverdueReminders, UpcomingReminders = t.UpcomingReminders };

        return query.AsNoTracking().ToListAsync(cancellationToken);
    }

    // The "taskId:kind" pairs already sent (or tried) on that day.
    public async Task<HashSet<string>> GetSentAsync(IReadOnlyCollection<int> taskIds, DateOnly forDate, CancellationToken cancellationToken)
    {
        var rows = await _dbContext.TaskReminderLogs.AsNoTracking().WhereActive().Where(l => taskIds.Contains(l.TaskId) && l.ForDate == forDate).Select(l => new { l.TaskId, l.Kind }).ToListAsync(cancellationToken);

        return rows.Select(r => $"{r.TaskId}:{r.Kind}").ToHashSet();
    }

    #endregion
}
