using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Application.Storage;
using Thakurg.Contracts.Configurations;
using Thakurg.Infrastructure.Notifications;
using Thakurg.Infrastructure.Repositories;
using Thakurg.Infrastructure.Services;
using Thakurg.Infrastructure.Storage;

namespace Thakurg.Infrastructure;

// My Tasks. Its settings (Tasks in appsettings.json) must all be there, or the API does not start.
public static partial class DependencyInjection
{
    #region Private Methods

    private static bool IsValidTasks(TasksOptions options)
    {
        var pin = options.Pin is { Length: >= 4 and <= 8, LockMinutes: > 0, MaxAttempts: > 0, RenewSeconds: > 0, ResetMinutes: > 0 } && options.Pin.MaxFailures > options.Pin.MaxAttempts;
        var newUser = options.NewUser is { WeekStart.Length: > 0, DefaultTab.Length: > 0, RemindBefore.Length: > 0, ReminderTime.Length: > 0, DefaultPriority: >= 1 and <= 3 } && options.NewUser.Categories.Any(c => c.IsSystem);

        var reminders = options.Reminders is { IntervalSeconds: > 0, UpcomingDays: > 0 } && TimeZoneInfo.TryFindSystemTimeZoneById(options.NewUser.TimeZone, out _);

        return pin && newUser && reminders && options.LocalFiles.Root.Length > 0;
    }

    static partial void AddTasksFeature(IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<TasksOptions>().Bind(configuration.GetSection(TasksOptions.SectionName)).Validate(IsValidTasks, "Tasks:Pin, Tasks:Reminders, Tasks:NewUser (with a system category and a known TimeZone) and Tasks:LocalFiles:Root must be set; Pin:MaxFailures must be above Pin:MaxAttempts.").ValidateOnStart();

        services.AddScoped<ITaskRepository, TaskRepository>();
        services.AddScoped<ITaskUserRepository, TaskUserRepository>();
        services.AddScoped<ITaskReminderRepository, TaskReminderRepository>();

        services.AddScoped<ITaskFileStore, LocalTaskFileStore>();
        services.AddScoped<ITaskService, TaskService>();
        services.AddScoped<ITaskLimitsService, TaskLimitsService>();
        services.AddScoped<ITaskReminderService, TaskReminderService>();
        services.AddHostedService<TaskReminderWorker>();
        services.AddScoped<ITaskPinService, TaskPinService>();
        services.AddScoped<ITaskProfileService, TaskProfileService>();
        services.AddScoped<ITaskSettingsService, TaskSettingsService>();
        services.AddScoped<ITaskCategoryService, TaskCategoryService>();
        services.AddScoped<ITaskAttachmentService, TaskAttachmentService>();
    }

    #endregion
}
