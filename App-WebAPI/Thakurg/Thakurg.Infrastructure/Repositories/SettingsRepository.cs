using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class SettingsRepository : ISettingsRepository
{
    private readonly ICommonDbContext _dbContext;

    public SettingsRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task<List<Feature>> GetFeaturesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Features.AsNoTracking().WhereActive().OrderBy(f => f.SortOrder).ToListAsync(cancellationToken);
    }

    public Task<List<PageName>> GetPageNamesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.PageNames.AsNoTracking().WhereActive().OrderBy(p => p.Id).ToListAsync(cancellationToken);
    }

    public Task<List<AppSetting>> GetAppSettingsAsync(CancellationToken cancellationToken)
    {
        return _dbContext.AppSettings.AsNoTracking().WhereActive().OrderBy(s => s.Id).ToListAsync(cancellationToken);
    }

    public Task<List<ServiceItem>> GetServiceItemsAsync(CancellationToken cancellationToken)
    {
        return _dbContext.ServiceItems.AsNoTracking().WhereActive().OrderBy(s => s.SortOrder).ToListAsync(cancellationToken);
    }

    public Task<string?> GetSettingValueAsync(string code, CancellationToken cancellationToken)
    {
        return _dbContext.AppSettings.AsNoTracking().WhereActive().Where(s => s.Code == code).Select(s => (string?)s.Value).FirstOrDefaultAsync(cancellationToken);
    }

    public Task<List<ConnectionField>> GetConnectionFieldsAsync(CancellationToken cancellationToken)
    {
        return _dbContext.ConnectionFields.AsNoTracking().WhereActive().OrderBy(f => f.SortOrder).ToListAsync(cancellationToken);
    }

    #endregion
}
