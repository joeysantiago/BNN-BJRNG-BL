using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class WhatsAppSettingRepository : IWhatsAppSettingRepository
{
    private readonly ICommonDbContext _dbContext;

    public WhatsAppSettingRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<WhatsAppSetting?> GetAsync(CancellationToken cancellationToken)
    {
        return _dbContext.WhatsAppSettings.WhereActive().OrderBy(s => s.Id).FirstOrDefaultAsync(cancellationToken);
    }

    public Task<WhatsAppSetting?> ReadAsync(CancellationToken cancellationToken)
    {
        return _dbContext.WhatsAppSettings.AsNoTracking().WhereActive().OrderBy(s => s.Id).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task AddAsync(WhatsAppSetting setting, CancellationToken cancellationToken)
    {
        _dbContext.WhatsAppSettings.Add(setting);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    #endregion
}
