namespace Thakurg.Application.Services;

public interface IHealthService
{
    Task<bool> WakeAsync(CancellationToken cancellationToken);
}
