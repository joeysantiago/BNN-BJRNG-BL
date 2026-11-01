using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class KhataIdempotencyRepository : IKhataIdempotencyRepository
{
    private readonly ICommonDbContext _dbContext;

    public KhataIdempotencyRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task RemoveAsync(int entryId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataIdempotencyKeys.Where(k => k.Id == entryId).ExecuteDeleteAsync(cancellationToken);
    }

    public Task DeleteExpiredAsync(DateTime now, CancellationToken cancellationToken)
    {
        return _dbContext.KhataIdempotencyKeys.Where(k => k.ExpiresOn <= now).ExecuteDeleteAsync(cancellationToken);
    }

    // The unique index (UserId, IdempotencyKey) decides which of two simultaneous requests wins; the loser gets false.
    public async Task<bool> TryReserveAsync(KhataIdempotencyKey entry, CancellationToken cancellationToken)
    {
        _dbContext.KhataIdempotencyKeys.Add(entry);

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);

            return true;
        }
        catch (DbUpdateException)
        {
            _dbContext.Entry(entry).State = EntityState.Detached;

            return false;
        }
    }

    public Task<KhataIdempotencyKey?> GetAsync(int userId, Guid idempotencyKey, CancellationToken cancellationToken)
    {
        return _dbContext.KhataIdempotencyKeys.AsNoTracking().FirstOrDefaultAsync(k => k.UserId == userId && k.IdempotencyKey == idempotencyKey, cancellationToken);
    }

    #endregion
}
