using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

// One-time login codes (OneTimeCodes). Wrong tries and use are counted with single UPDATE statements, so two requests at once cannot both use one code.
public class OtpRepository : IOtpRepository
{
    private readonly ICommonDbContext _dbContext;

    public OtpRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public async Task AddAsync(OneTimeCode code, CancellationToken cancellationToken)
    {
        _dbContext.OneTimeCodes.Add(code);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    // A code that could not be sent no longer counts as sent.
    public Task InvalidateAsync(int codeId, DateTime now, CancellationToken cancellationToken)
    {
        return _dbContext.OneTimeCodes.Where(c => c.Id == codeId).ExecuteUpdateAsync(u => u.SetProperty(c => c.IsSoftDeleted, true).SetProperty(c => c.ModifiedOn, now), cancellationToken);
    }

    public Task AddAttemptAsync(int codeId, DateTime now, CancellationToken cancellationToken)
    {
        return _dbContext.OneTimeCodes.Where(c => c.Id == codeId).ExecuteUpdateAsync(u => u.SetProperty(c => c.Attempts, c => c.Attempts + 1).SetProperty(c => c.ModifiedOn, now), cancellationToken);
    }

    // True only for the request that marks the code used; a second request with the same code gets false.
    public async Task<bool> TryConsumeAsync(int codeId, DateTime now, CancellationToken cancellationToken)
    {
        var updated = await _dbContext.OneTimeCodes.Where(c => c.Id == codeId && c.ConsumedOn == null && c.ExpiresOn > now).ExecuteUpdateAsync(u => u.SetProperty(c => c.ConsumedOn, now).SetProperty(c => c.ModifiedOn, now), cancellationToken);

        return updated == 1;
    }

    // When each code still counting for the address was sent (a code that could not be sent is not counted).
    public Task<List<DateTime>> GetSentOnAsync(string destination, DateTime since, CancellationToken cancellationToken)
    {
        return _dbContext.OneTimeCodes.AsNoTracking().WhereActive().Where(c => c.Destination == destination && c.CreatedOn >= since).Select(c => c.CreatedOn).ToListAsync(cancellationToken);
    }

    // Only the newest code of an address, channel and app is valid: asking for a new code replaces the old one.
    public Task<OneTimeCode?> GetLatestAsync(string destination, string channel, string appCode, CancellationToken cancellationToken)
    {
        return _dbContext.OneTimeCodes.AsNoTracking().WhereActive().Where(c => c.Destination == destination && c.Channel == channel && c.AppCode == appCode).OrderByDescending(c => c.Id).FirstOrDefaultAsync(cancellationToken);
    }

    // When each code of the address sent since then was used up by wrong tries (its last wrong try).
    public Task<List<DateTime>> GetFailedOnAsync(string destination, DateTime since, int maxAttempts, CancellationToken cancellationToken)
    {
        return _dbContext.OneTimeCodes.AsNoTracking().WhereActive().Where(c => c.Destination == destination && c.CreatedOn >= since && c.Attempts >= maxAttempts).Select(c => c.ModifiedOn ?? c.CreatedOn).ToListAsync(cancellationToken);
    }

    #endregion
}
