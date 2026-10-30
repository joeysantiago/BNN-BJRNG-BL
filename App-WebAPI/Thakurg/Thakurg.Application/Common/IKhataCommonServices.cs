using Thakurg.Application.Services;

namespace Thakurg.Application.Common;

public interface IKhataCommonServices
{
    IKhataPinService Pin { get; }

    IKhataAuditService Audit { get; }

    IMessageService Messages { get; }

    IKhataIdempotencyService Idempotency { get; }
}
