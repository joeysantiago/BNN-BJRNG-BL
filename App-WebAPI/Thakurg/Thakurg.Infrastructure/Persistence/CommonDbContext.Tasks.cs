using Microsoft.EntityFrameworkCore;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Persistence;

// The tables of My Tasks (SqlScripts/CREATE/Tasks). A task owns its checklist lines and pictures (TaskId).
public partial class CommonDbContext
{
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();

    public DbSet<TaskUser> TaskUsers => Set<TaskUser>();

    public DbSet<TaskHistory> TaskHistory => Set<TaskHistory>();

    public DbSet<TaskCategory> TaskCategories => Set<TaskCategory>();

    public DbSet<TaskAttachment> TaskAttachments => Set<TaskAttachment>();

    public DbSet<TaskLockSession> TaskLockSessions => Set<TaskLockSession>();

    public DbSet<TaskReminderLog> TaskReminderLogs => Set<TaskReminderLog>();

    public DbSet<TaskChecklistItem> TaskChecklistItems => Set<TaskChecklistItem>();

    #region Private Methods

    partial void OnTasksModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TaskUser>().ToTable("TaskUsers");
        modelBuilder.Entity<TaskHistory>().ToTable("TaskHistory");
        modelBuilder.Entity<TaskCategory>().ToTable("TaskCategories");
        modelBuilder.Entity<TaskAttachment>().ToTable("TaskAttachments");
        modelBuilder.Entity<TaskLockSession>().ToTable("TaskLockSessions");
        modelBuilder.Entity<TaskReminderLog>().ToTable("TaskReminderLogs");
        modelBuilder.Entity<TaskChecklistItem>().ToTable("TaskChecklistItems");
        modelBuilder.Entity<TaskItem>().ToTable("TaskItems");
        modelBuilder.Entity<TaskItem>().HasMany(t => t.Attachments).WithOne().HasForeignKey(a => a.TaskId);
        modelBuilder.Entity<TaskItem>().HasMany(t => t.ChecklistItems).WithOne().HasForeignKey(c => c.TaskId);
    }

    #endregion
}
