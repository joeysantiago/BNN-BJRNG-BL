using Microsoft.EntityFrameworkCore;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Common;

// The tables of My Tasks (SqlScripts/CREATE/Tasks).
public partial interface ICommonDbContext
{
    DbSet<TaskItem> TaskItems { get; }

    DbSet<TaskUser> TaskUsers { get; }

    DbSet<TaskHistory> TaskHistory { get; }

    DbSet<TaskCategory> TaskCategories { get; }

    DbSet<TaskAttachment> TaskAttachments { get; }

    DbSet<TaskLockSession> TaskLockSessions { get; }

    DbSet<TaskReminderLog> TaskReminderLogs { get; }

    DbSet<TaskChecklistItem> TaskChecklistItems { get; }
}
