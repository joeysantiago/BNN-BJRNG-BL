using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

public interface IKhataIdempotencyService
{
    Task<T> RunAsync<T>(KhataCallerDto caller, Guid? idempotencyKey, string endpoint, object request, Func<Task<T>> action, CancellationToken cancellationToken);
}
