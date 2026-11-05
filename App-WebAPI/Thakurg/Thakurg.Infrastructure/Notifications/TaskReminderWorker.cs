using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;

namespace Thakurg.Infrastructure.Notifications;

// Every Tasks:Reminders:IntervalSeconds, sends the WhatsApp reminders of My Tasks that are due (ITaskReminderService), in its own scope.
public class TaskReminderWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;

    private readonly TasksRemindersOptions _options;

    private readonly ILogger<TaskReminderWorker> _logger;

    public TaskReminderWorker(IServiceScopeFactory scopes, IOptions<TasksOptions> options, ILogger<TaskReminderWorker> logger)
    {
        _scopes = scopes;
        _options = options.Value.Reminders;
        _logger = logger;
    }

    #region Private Methods

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(_options.IntervalSeconds));

        do
        {
            try
            {
                await using var scope = _scopes.CreateAsyncScope();
                await scope.ServiceProvider.GetRequiredService<ITaskReminderService>().RunAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "The task reminder run failed");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    #endregion
}
