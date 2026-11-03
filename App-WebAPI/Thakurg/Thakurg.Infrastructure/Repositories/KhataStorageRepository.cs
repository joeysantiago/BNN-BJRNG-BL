using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

// The site's one storage settings row (KhataStorageSettings); none yet = local files.
public class KhataStorageRepository : IKhataStorageRepository
{
    private readonly ICommonDbContext _dbContext;

    public KhataStorageRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<KhataStorageSetting?> GetAsync(CancellationToken cancellationToken)
    {
        return _dbContext.KhataStorageSettings.WhereActive().OrderBy(s => s.Id).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task AddAsync(KhataStorageSetting setting, CancellationToken cancellationToken)
    {
        _dbContext.KhataStorageSettings.Add(setting);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    #endregion
}
