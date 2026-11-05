using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Tasks;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

// WhatsApp reminders of My Tasks, in the time zone and language of each user, once per task, kind and day (TaskReminderLogs):
// - due: a task with a time, "remind before" its time; a task without a time, at the daily reminder time;
// - overdue: at the daily reminder time, every day until it is completed (when switched on);
// - upcoming: at the daily reminder time, for tasks due in the next UpcomingDays days (when switched on).
// A failed send is logged (not retried that day) so a wrong number never floods the provider.
public class TaskReminderService : ITaskReminderService
{
    private readonly IWhatsAppSender _sender;

    private readonly TasksRemindersOptions _options;

    private readonly IMessageService _messageService;

    private readonly ITaskRepository _taskRepository;

    private readonly ILogger<TaskReminderService> _logger;

    private readonly ITaskReminderRepository _reminderRepository;

    private static readonly Dictionary<string, int> BeforeMinutes = new() { ["0"] = 0, ["15m"] = 15, ["1h"] = 60, ["1d"] = 1440 };

    public TaskReminderService(IOptions<TasksOptions> options, ITaskReminderRepository reminderRepository, ITaskRepository taskRepository, IWhatsAppSender sender, IMessageService messageService, ILogger<TaskReminderService> logger)
    {
        _options = options.Value.Reminders;
        _reminderRepository = reminderRepository;
        _taskRepository = taskRepository;
        _sender = sender;
        _messageService = messageService;
        _logger = logger;
    }

    #region Public Methods

    public async Task RunAsync(CancellationToken cancellationToken)
    {
        var recipients = await _reminderRepository.GetRecipientsAsync(AppCodes.Tasks, cancellationToken);

        if (recipients.Count == 0)
            return;

        var names = await _reminderRepository.GetAppNamesAsync(AppCodes.Tasks, cancellationToken);

        foreach (var recipient in recipients)
        {
            try
            {
                await RemindAsync(recipient, names, cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Task reminders of user {UserId} failed", recipient.UserId);
            }
        }
    }

    #endregion

    #region Private Methods

    private static DateTime LocalNow(string timeZone)
    {
        var zone = TimeZoneInfo.TryFindSystemTimeZoneById(timeZone, out var found) ? found : TimeZoneInfo.Utc;

        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone);
    }

    private static string When(DateOnly date, TimeOnly? time)
    {
        return date.ToString("dd-MM-yyyy") + (time is { } t ? " " + t.ToString("HH:mm") : string.Empty);
    }

    // The kind of reminder a task needs now, or null.
    private string? KindOf(TaskItem task, TaskReminderRecipientDto user, DateTime now)
    {
        var today = DateOnly.FromDateTime(now);
        var daily = TimeOnly.TryParseExact(user.ReminderTime, "HH:mm", out var at) && TimeOnly.FromDateTime(now) >= at;
        var due = task.DueDate!.Value;
        var overdue = due < today || (due == today && task.DueTime is { } t && TimeOnly.FromDateTime(now) > t);

        if (overdue)
            return user.OverdueReminders && daily ? TaskReminderKinds.Overdue : null;

        if (due == today && task.DueTime is { } time)
            return now >= today.ToDateTime(time).AddMinutes(-BeforeMinutes.GetValueOrDefault(user.RemindBefore)) ? TaskReminderKinds.Due : null;

        if (due == today)
            return daily ? TaskReminderKinds.Due : null;

        return user.UpcomingReminders && daily && due <= today.AddDays(_options.UpcomingDays) ? TaskReminderKinds.Upcoming : null;
    }

    private Task<string> Text(string language, string code, string app, TaskItem task)
    {
        return _messageService.GetInAsync(language, code, app, task.Title, When(task.DueDate!.Value, task.DueTime));
    }

    private async Task RemindAsync(TaskReminderRecipientDto user, Dictionary<string, string> names, CancellationToken cancellationToken)
    {
        var now = LocalNow(user.TimeZone);
        var today = DateOnly.FromDateTime(now);
        var tasks = (await _taskRepository.GetTasksAsync(user.UserId, cancellationToken)).Where(t => t is { CompletedOn: null, RemindEnabled: true, DueDate: not null }).ToList();
        var sent = await _reminderRepository.GetSentAsync(tasks.Select(t => t.Id).ToList(), today, cancellationToken);
        var app = names.GetValueOrDefault(user.Language) ?? names.GetValueOrDefault("en") ?? AppCodes.Tasks;

        foreach (var task in tasks)
        {
            var kind = KindOf(task, user, now);

            if (kind is null || sent.Contains($"{task.Id}:{kind}"))
                continue;

            var code = kind == TaskReminderKinds.Overdue ? MessageCodes.TasksWhatsAppOverdue : kind == TaskReminderKinds.Upcoming ? MessageCodes.TasksWhatsAppUpcoming : MessageCodes.TasksWhatsAppDue;
            var log = new TaskReminderLog { TaskId = task.Id, Kind = kind, ForDate = today, Channel = TaskReminderKinds.WhatsApp, Status = TaskReminderKinds.Sent };

            try
            {
                await _sender.SendAsync(user.Mobile, await Text(user.Language, code, app, task), cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
            {
                log.Status = TaskReminderKinds.Failed;
                log.Error = ex is BusinessException business ? business.Code : MessageCodes.WhatsAppSendFailed;
            }

            await _reminderRepository.AddLogAsync(log, cancellationToken);
        }
    }

    #endregion
}
