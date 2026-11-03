using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

// The mail server profiles (MailSettings), at most one per purpose; none yet = the server in appsettings Email:Smtp.
public class MailSettingRepository : IMailSettingRepository
{
    private readonly ICommonDbContext _dbContext;

    public MailSettingRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<List<MailSetting>> GetAllAsync(CancellationToken cancellationToken)
    {
        return _dbContext.MailSettings.AsNoTracking().WhereActive().ToListAsync(cancellationToken);
    }

    public async Task AddAsync(MailSetting setting, CancellationToken cancellationToken)
    {
        _dbContext.MailSettings.Add(setting);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<MailSetting?> GetAsync(string purpose, CancellationToken cancellationToken)
    {
        return _dbContext.MailSettings.WhereActive().FirstOrDefaultAsync(s => s.Purpose == purpose, cancellationToken);
    }

    #endregion
}
