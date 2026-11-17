using Thakurg.Application.Repositories;
using Thakurg.Application.Services;

namespace Thakurg.Infrastructure.Services;

public class HealthService : IHealthService
{
    private readonly IHealthRepository _healthRepository;

    public HealthService(IHealthRepository healthRepository)
    {
        _healthRepository = healthRepository;
    }

    #region Public Methods

    public Task<bool> WakeAsync(CancellationToken cancellationToken)
    {
        return _healthRepository.PingAsync(cancellationToken);
    }

    #endregion
}
