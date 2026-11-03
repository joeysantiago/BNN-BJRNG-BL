using System.Threading.Channels;
using Thakurg.Application.Services;
using Thakurg.Contracts.Khata;

namespace Thakurg.Infrastructure.Notifications;

// In-memory queue between the entry save and KhataNotificationWorker. When it is full (the senders are far behind) a new message is dropped rather than slowing the save.
public class KhataNotificationQueue : IKhataNotificationQueue
{
    private const int Capacity = 1000;

    private readonly Channel<KhataNotificationJobDto> _channel = Channel.CreateBounded<KhataNotificationJobDto>(new BoundedChannelOptions(Capacity) { FullMode = BoundedChannelFullMode.DropWrite, SingleReader = true });

    #region Public Methods

    public void Enqueue(KhataNotificationJobDto job)
    {
        _channel.Writer.TryWrite(job);
    }

    public IAsyncEnumerable<KhataNotificationJobDto> ReadAllAsync(CancellationToken cancellationToken)
    {
        return _channel.Reader.ReadAllAsync(cancellationToken);
    }

    #endregion
}
