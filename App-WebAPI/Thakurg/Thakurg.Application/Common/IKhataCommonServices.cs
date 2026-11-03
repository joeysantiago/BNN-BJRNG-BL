using Thakurg.Application.Services;

namespace Thakurg.Application.Common;

public interface IKhataCommonServices
{
    IKhataAuditService Audit { get; }

    IKhataNotificationQueue Notifications { get; }

    IMessageService Messages { get; }

    IKhataIdempotencyService Idempotency { get; }
}
