using Thakurg.Application.Common;
using Thakurg.Application.Services;

namespace Thakurg.Infrastructure.Common;

// Bundle of the services every SnapKhata ledger service needs (App-Document/constructor-injection-limit.md).
public class KhataCommonServices : IKhataCommonServices
{
    public IKhataPinService Pin { get; }

    public IKhataAuditService Audit { get; }

    public IMessageService Messages { get; }

    public IKhataIdempotencyService Idempotency { get; }

    public KhataCommonServices(IKhataPinService pin, IMessageService messages, IKhataAuditService audit, IKhataIdempotencyService idempotency)
    {
        Pin = pin;
        Messages = messages;
        Audit = audit;
        Idempotency = idempotency;
    }
}
