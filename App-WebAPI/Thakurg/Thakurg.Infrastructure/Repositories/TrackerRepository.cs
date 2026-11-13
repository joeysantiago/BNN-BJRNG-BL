using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Contracts.Tracker;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class TrackerRepository : ITrackerRepository
{
    private readonly ICommonDbContext _dbContext;

    public TrackerRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public void AddAlert(TrackerAlert alert)
    {
        _dbContext.TrackerAlerts.Add(alert);
    }

    public void AddRule(TrackerCategoryRule rule)
    {
        _dbContext.TrackerCategoryRules.Add(rule);
    }

    public void AddAccount(TrackerAccount account)
    {
        _dbContext.TrackerAccounts.Add(account);
    }

    public void AddTransaction(TrackerTransaction transaction)
    {
        _dbContext.TrackerTransactions.Add(transaction);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    // Removes everything of one user in SnapTracker for good (transactions, SMS texts, accounts, alerts, rules, the profile) in one transaction. The access to the app
    // stays; the next call makes a new profile with the starting settings.
    public async Task DeleteAllAsync(int userId, CancellationToken cancellationToken)
    {
        var strategy = _dbContext.Database.CreateExecutionStrategy();

        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
            var ids = _dbContext.TrackerTransactions.Where(t => t.TrackerUserId == userId).Select(t => t.Id);
            await _dbContext.TrackerSmsTexts.Where(s => ids.Contains(s.TransactionId)).ExecuteDeleteAsync(cancellationToken);
            await _dbContext.TrackerTransactions.Where(t => t.TrackerUserId == userId).ExecuteUpdateAsync(t => t.SetProperty(x => x.DuplicateOfId, (int?)null).SetProperty(x => x.PairId, (int?)null), cancellationToken);
            await _dbContext.TrackerTransactions.Where(t => t.TrackerUserId == userId).ExecuteDeleteAsync(cancellationToken);
            await _dbContext.TrackerAccounts.Where(a => a.TrackerUserId == userId).ExecuteDeleteAsync(cancellationToken);
            await _dbContext.TrackerAlerts.Where(a => a.TrackerUserId == userId).ExecuteDeleteAsync(cancellationToken);
            await _dbContext.TrackerCategoryRules.Where(r => r.TrackerUserId == userId).ExecuteDeleteAsync(cancellationToken);
            await _dbContext.TrackerUsers.Where(u => u.Id == userId).ExecuteDeleteAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        });
    }

    public async Task DeleteSmsTextsAsync(int userId, CancellationToken cancellationToken)
    {
        var ids = _dbContext.TrackerTransactions.Where(t => t.TrackerUserId == userId).Select(t => t.Id);
        await _dbContext.TrackerSmsTexts.Where(s => ids.Contains(s.TransactionId)).ExecuteDeleteAsync(cancellationToken);
    }

    public Task<TrackerUser?> GetUserAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.TrackerUsers.WhereActive().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    // Keeps the newest alerts of the user and deletes the older ones.
    public async Task TrimAlertsAsync(int userId, int keep, CancellationToken cancellationToken)
    {
        var old = _dbContext.TrackerAlerts.Where(a => a.TrackerUserId == userId).OrderByDescending(a => a.Id).Skip(keep).Select(a => a.Id);
        await _dbContext.TrackerAlerts.Where(a => old.Contains(a.Id)).ExecuteDeleteAsync(cancellationToken);
    }

    // The profile. False when a parallel request made it first (the unique UserId index refuses the second).
    public async Task<bool> TryAddUserAsync(TrackerUser user, CancellationToken cancellationToken)
    {
        _dbContext.TrackerUsers.Add(user);

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);

            return true;
        }
        catch (DbUpdateException)
        {
            _dbContext.TrackerUsers.Entry(user).State = EntityState.Detached;

            return false;
        }
    }

    public Task<List<TrackerAlert>> GetAlertsAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.TrackerAlerts.WhereActive().Where(a => a.TrackerUserId == userId).OrderByDescending(a => a.Id).ToListAsync(cancellationToken);
    }

    public Task<List<TrackerAccount>> GetAccountsAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.TrackerAccounts.WhereActive().Where(a => a.TrackerUserId == userId).OrderBy(a => a.AccountType).ThenBy(a => a.Id).ToListAsync(cancellationToken);
    }

    public Task<List<TrackerCategoryRule>> GetRulesAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.TrackerCategoryRules.WhereActive().Where(r => r.TrackerUserId == userId).ToListAsync(cancellationToken);
    }

    public Task<TrackerUser?> FindUserByAccountAsync(int accountUserId, CancellationToken cancellationToken)
    {
        return _dbContext.TrackerUsers.AsNoTracking().WhereActive().FirstOrDefaultAsync(u => u.UserId == accountUserId, cancellationToken);
    }

    public Task<List<TrackerTransaction>> GetTransactionsAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.TrackerTransactions.WhereActive().Include(t => t.SmsText).Where(t => t.TrackerUserId == userId).OrderByDescending(t => t.OccurredOn).ToListAsync(cancellationToken);
    }

    // Deletes one transaction and its SMS text; transactions that were its duplicates or its pair keep their status but no longer point at it.
    public async Task RemoveTransactionAsync(TrackerTransaction transaction, CancellationToken cancellationToken)
    {
        await _dbContext.TrackerTransactions.Where(t => t.DuplicateOfId == transaction.Id).ExecuteUpdateAsync(t => t.SetProperty(x => x.DuplicateOfId, (int?)null), cancellationToken);
        await _dbContext.TrackerTransactions.Where(t => t.PairId == transaction.Id).ExecuteUpdateAsync(t => t.SetProperty(x => x.PairId, (int?)null), cancellationToken);

        if (transaction.SmsText is not null)
            _dbContext.TrackerSmsTexts.Remove(transaction.SmsText);

        _dbContext.TrackerTransactions.Remove(transaction);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<TrackerTransaction?> GetTransactionAsync(int userId, int id, CancellationToken cancellationToken)
    {
        return _dbContext.TrackerTransactions.WhereActive().Include(t => t.SmsText).FirstOrDefaultAsync(t => t.Id == id && t.TrackerUserId == userId, cancellationToken);
    }

    // The transactions that could be the same payment: the same reference, the same SMS text, or the same amount in the time window. The service decides.
    // A message imported before: the same text received at the same moment.
    public Task<bool> HasSmsAsync(int userId, string bodyHash, DateTime receivedOn, CancellationToken cancellationToken)
    {
        return _dbContext.TrackerTransactions.WhereActive().AnyAsync(t => t.TrackerUserId == userId && t.SmsText != null && t.SmsText.BodyHash == bodyHash && t.SmsText.ReceivedOn == receivedOn, cancellationToken);
    }

    public Task<List<TrackerTransaction>> GetDuplicateCandidatesAsync(int userId, string? reference, string bodyHash, long amountMinor, DateTime from, DateTime to, CancellationToken cancellationToken)
    {
        return _dbContext.TrackerTransactions.WhereActive().Include(t => t.SmsText)
            .Where(t => t.TrackerUserId == userId && t.Status != TrackerStatuses.Duplicate)
            .Where(t => (reference != null && t.Reference == reference) || (t.SmsText != null && t.SmsText.BodyHash == bodyHash) || (t.AmountMinor == amountMinor && t.OccurredOn >= from && t.OccurredOn <= to))
            .OrderBy(t => t.Id).ToListAsync(cancellationToken);
    }

    #endregion
}
