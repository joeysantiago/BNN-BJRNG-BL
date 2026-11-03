using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Thakurg.Application.Services;

namespace Thakurg.Infrastructure.Notifications;

// Sends the queued party messages one at a time, each in its own scope; a failure is logged and never stops the worker.
public class KhataNotificationWorker : BackgroundService
{
    private readonly IKhataNotificationQueue _queue;

    private readonly IServiceScopeFactory _scopeFactory;

    private readonly ILogger<KhataNotificationWorker> _logger;

    public KhataNotificationWorker(IKhataNotificationQueue queue, IServiceScopeFactory scopeFactory, ILogger<KhataNotificationWorker> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    #region Private Methods

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var job in _queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                await scope.ServiceProvider.GetRequiredService<IKhataNotificationService>().SendAsync(job, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Telling contact {ContactId} about entry {TransactionId} failed", job.ContactId, job.TransactionId);
            }
        }
    }

    #endregion
}
