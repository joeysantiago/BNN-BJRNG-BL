using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

// Entry changes waiting to be told to their party. Enqueue never blocks the entry save; a background worker reads the queue.
public interface IKhataNotificationQueue
{
    void Enqueue(KhataNotificationJobDto job);

    IAsyncEnumerable<KhataNotificationJobDto> ReadAllAsync(CancellationToken cancellationToken);
}
