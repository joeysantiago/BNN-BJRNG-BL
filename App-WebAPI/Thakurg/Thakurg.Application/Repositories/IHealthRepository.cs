namespace Thakurg.Application.Repositories;

public interface IHealthRepository
{
    Task<bool> PingAsync(CancellationToken cancellationToken);
}
