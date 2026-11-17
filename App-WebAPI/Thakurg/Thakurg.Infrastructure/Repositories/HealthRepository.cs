using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;

namespace Thakurg.Infrastructure.Repositories;

public class HealthRepository : IHealthRepository
{
    private readonly ICommonDbContext _dbContext;

    public HealthRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    // The smallest query that reaches the database, so a paused (serverless) database starts to wake.
    public Task<bool> PingAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Apps.AsNoTracking().AnyAsync(cancellationToken);
    }

    #endregion
}
