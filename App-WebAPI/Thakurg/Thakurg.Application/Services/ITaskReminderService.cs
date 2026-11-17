namespace Thakurg.Application.Services;

// Sends the WhatsApp reminders of Tasks that are due now (called by TaskReminderWorker).
public interface ITaskReminderService
{
    Task RunAsync(CancellationToken cancellationToken);
}
