using System.Threading.Channels;
using Microsoft.Extensions.Options;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Khata;

namespace Thakurg.Infrastructure.Notifications;

// In-memory queue between the entry save and KhataNotificationWorker, at most Khata:Notifications:QueueCapacity long. When it is full (the senders are far behind)
// a new message is dropped rather than slowing the save.
public class KhataNotificationQueue : IKhataNotificationQueue
{
    private readonly Channel<KhataNotificationJobDto> _channel;

    public KhataNotificationQueue(IOptions<KhataOptions> options)
    {
        _channel = Channel.CreateBounded<KhataNotificationJobDto>(new BoundedChannelOptions(options.Value.Notifications.QueueCapacity) { FullMode = BoundedChannelFullMode.DropWrite, SingleReader = true });
    }

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
