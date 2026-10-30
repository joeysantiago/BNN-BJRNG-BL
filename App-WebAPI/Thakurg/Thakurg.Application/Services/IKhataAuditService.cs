using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

public interface IKhataAuditService
{
    Task WriteAsync(string action, int? userId, KhataCallerDto caller, object? details, CancellationToken cancellationToken);
}
