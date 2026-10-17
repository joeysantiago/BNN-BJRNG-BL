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

    public async Task UpdateAsync(Dictionary<string, bool> features, Dictionary<string, bool> fields, Dictionary<string, bool> services, Dictionary<string, string> appSettings, CancellationToken cancellationToken)
    {
        var featureCodes = features.Keys.ToList();
        var fieldCodes = fields.Keys.ToList();
        var serviceCodes = services.Keys.ToList();
        var settingCodes = appSettings.Keys.ToList();
        var now = DateTime.UtcNow;

        foreach (var row in await _dbContext.Features.WhereActive().Where(f => featureCodes.Contains(f.Code)).ToListAsync(cancellationToken))
        {
            row.IsEnabled = features[row.Code];
            row.ModifiedOn = now;
        }

        foreach (var row in await _dbContext.ConnectionFields.WhereActive().Where(f => fieldCodes.Contains(f.Code)).ToListAsync(cancellationToken))
        {
            row.IsEnabled = fields[row.Code];
            row.ModifiedOn = now;
        }

        foreach (var row in await _dbContext.ServiceItems.WhereActive().Where(s => serviceCodes.Contains(s.Code)).ToListAsync(cancellationToken))
        {
            row.IsEnabled = services[row.Code];
            row.ModifiedOn = now;
        }

        var existing = await _dbContext.AppSettings.WhereActive().Where(s => settingCodes.Contains(s.Code)).ToListAsync(cancellationToken);

        foreach (var (code, value) in appSettings)
        {
            var row = existing.FirstOrDefault(s => s.Code == code);

            if (row is null)
                _dbContext.AppSettings.Add(new AppSetting { Code = code, Value = value });
            else
            {
                row.Value = value;
                row.ModifiedOn = now;
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    #endregion
}
