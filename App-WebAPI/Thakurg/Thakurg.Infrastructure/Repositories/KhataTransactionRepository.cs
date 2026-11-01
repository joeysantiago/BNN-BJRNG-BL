using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class KhataTransactionRepository : IKhataTransactionRepository
{
    private readonly ICommonDbContext _dbContext;

    public KhataTransactionRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task<KhataTransaction?> GetTransactionAsync(int transactionId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataTransactions.FirstOrDefaultAsync(t => t.Id == transactionId && t.IsActive && !t.IsDeleted && !t.IsSoftDeleted, cancellationToken);
    }

    public Task<List<KhataTransactionHistory>> GetHistoryAsync(int transactionId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataTransactionHistory.AsNoTracking().Where(h => h.TransactionId == transactionId).OrderBy(h => h.Version).ToListAsync(cancellationToken);
    }

    // Entry, its first history row and the contact balance are saved in one SQL transaction (design S3).
    public async Task AddAsync(KhataTransaction entry, KhataTransactionHistory history, long balanceDelta, CancellationToken cancellationToken)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        _dbContext.KhataTransactions.Add(entry);
        await _dbContext.SaveChangesAsync(cancellationToken);

        history.TransactionId = entry.Id;
        _dbContext.KhataTransactionHistory.Add(history);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await AdjustBalanceAsync(entry.ContactId, balanceDelta, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    // Soft-deleted entries are listed too, so both sides still see them with a "deleted" label.
    public async Task<(List<KhataTransaction> Items, int Total)> GetPageAsync(int contactId, int page, int pageSize, CancellationToken cancellationToken)
    {
        var query = _dbContext.KhataTransactions.AsNoTracking().Where(t => t.ContactId == contactId && t.IsActive && !t.IsDeleted);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(t => t.EntryDate).ThenByDescending(t => t.CreatedOn).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);

        return (items, total);
    }

    // False when the entry was changed since the caller read it; then nothing is saved.
    public async Task<bool> UpdateAsync(KhataTransaction entry, byte[] expectedRowVersion, KhataTransactionHistory history, long balanceDelta, CancellationToken cancellationToken)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        _dbContext.Entry(entry).Property(t => t.RowVersion).OriginalValue = expectedRowVersion;
        _dbContext.KhataTransactionHistory.Add(history);

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return false;
        }

        await AdjustBalanceAsync(entry.ContactId, balanceDelta, cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return true;
    }

    #endregion

    #region Private Methods

    private Task AdjustBalanceAsync(int contactId, long balanceDelta, CancellationToken cancellationToken)
    {
        return _dbContext.KhataContacts.Where(c => c.Id == contactId).ExecuteUpdateAsync(s => s.SetProperty(c => c.BalanceMinor, c => c.BalanceMinor + balanceDelta).SetProperty(c => c.ModifiedOn, DateTime.UtcNow), cancellationToken);
    }

    #endregion
}
