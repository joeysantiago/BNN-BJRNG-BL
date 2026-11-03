using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Contracts.Khata;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Repositories;

public class KhataTransactionRepository : IKhataTransactionRepository
{
    private readonly ICommonDbContext _dbContext;

    private const byte GotType = (byte)KhataEntryType.Got;

    private const byte GaveType = (byte)KhataEntryType.Gave;

    public KhataTransactionRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task<int> CountLiveEntriesAsync(int bookId, CancellationToken cancellationToken)
    {
        return BookEntries(bookId).CountAsync(t => !t.IsSoftDeleted, cancellationToken);
    }

    public Task<KhataTransaction?> GetTransactionAsync(int transactionId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataTransactions.FirstOrDefaultAsync(t => t.Id == transactionId && t.IsActive && !t.IsDeleted && !t.IsSoftDeleted, cancellationToken);
    }

    // Soft-deleted entries too: their details and photos stay viewable with a "deleted" label.
    public Task<KhataTransaction?> GetAnyTransactionAsync(int transactionId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataTransactions.FirstOrDefaultAsync(t => t.Id == transactionId && t.IsActive && !t.IsDeleted, cancellationToken);
    }

    public Task<List<KhataTransactionHistory>> GetHistoryAsync(int transactionId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataTransactionHistory.AsNoTracking().Where(h => h.TransactionId == transactionId).OrderBy(h => h.Version).ToListAsync(cancellationToken);
    }

    public async Task<TransactionDto?> GetEntryAsync(int transactionId, int userId, CancellationToken cancellationToken)
    {
        var entries = await ToDtosAsync(_dbContext.KhataTransactions.AsNoTracking().Where(t => t.Id == transactionId && t.IsActive && !t.IsDeleted), userId, cancellationToken);

        return entries.FirstOrDefault();
    }

    // Live entries of the book summed per calendar month of EntryDate, for months in [from, to); months without entries are left out.
    public async Task<List<BookMonthDto>> GetMonthTotalsAsync(int bookId, DateOnly from, DateOnly to, CancellationToken cancellationToken)
    {
        var rows = await BookEntries(bookId).Where(t => !t.IsSoftDeleted && t.EntryDate >= from && t.EntryDate < to)
            .GroupBy(t => new { t.EntryDate.Year, t.EntryDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Gave = g.Sum(t => t.EntryType == GaveType ? t.AmountMinor : 0L), Got = g.Sum(t => t.EntryType == GotType ? t.AmountMinor : 0L), Count = g.Count() })
            .ToListAsync(cancellationToken);

        return rows.Select(r => new BookMonthDto { Month = KhataQuery.Month(r.Year, r.Month), GaveMinor = r.Gave, GotMinor = r.Got, EntryCount = r.Count }).ToList();
    }

    // Entry, its first history row and the contact balance are saved in one SQL transaction (design S3).
    // The database retries on failure, so the whole transaction runs through the execution strategy and is repeated as one unit.
    public async Task AddAsync(KhataTransaction entry, KhataTransactionHistory history, long balanceDelta, CancellationToken cancellationToken)
    {
        var strategy = _dbContext.Database.CreateExecutionStrategy();

        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
            _dbContext.KhataTransactions.Add(entry);
            await _dbContext.SaveChangesAsync(cancellationToken);

            history.TransactionId = entry.Id;
            _dbContext.KhataTransactionHistory.Add(history);
            await _dbContext.SaveChangesAsync(cancellationToken);
            await AdjustBalanceAsync(entry.ContactId, balanceDelta, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        });
    }

    // False when the entry was changed since the caller read it; then nothing is saved.
    public async Task<bool> UpdateAsync(KhataTransaction entry, byte[] expectedRowVersion, KhataTransactionHistory history, long balanceDelta, CancellationToken cancellationToken)
    {
        var strategy = _dbContext.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
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
        });
    }

    // One page of a contact's or a book's entries. Total counts every matching entry (deleted ones included when the kind shows them);
    // the gave / got sums count only the live ones, across all pages.
    public async Task<(List<TransactionDto> Items, int Total, long GaveMinor, long GotMinor)> GetPageAsync(TransactionFilterDto filter, int userId, CancellationToken cancellationToken)
    {
        var query = Filter(filter);
        var live = query.Where(t => !t.IsSoftDeleted);
        var total = await query.CountAsync(cancellationToken);
        var gaveMinor = await live.Where(t => t.EntryType == GaveType).SumAsync(t => (long?)t.AmountMinor, cancellationToken) ?? 0;
        var gotMinor = await live.Where(t => t.EntryType == GotType).SumAsync(t => (long?)t.AmountMinor, cancellationToken) ?? 0;
        var items = await ToDtosAsync(Sort(query, filter.Sort).Skip((filter.Page - 1) * filter.PageSize).Take(filter.PageSize), userId, cancellationToken);

        return (items, total, gaveMinor, gotMinor);
    }

    #endregion

    #region Private Methods

    // Entries of a book whose contact is still there (a deleted contact's entries are no longer visible).
    private IQueryable<KhataTransaction> BookEntries(int bookId)
    {
        var contacts = _dbContext.KhataContacts.WhereActive();

        return _dbContext.KhataTransactions.AsNoTracking().Where(t => t.BookId == bookId && t.IsActive && !t.IsDeleted && contacts.Any(c => c.Id == t.ContactId));
    }

    private IQueryable<KhataTransaction> Filter(TransactionFilterDto filter)
    {
        var photos = _dbContext.KhataAttachments.WhereActive();
        var query = filter.BookId is int bookId ? BookEntries(bookId) : _dbContext.KhataTransactions.AsNoTracking().Where(t => t.ContactId == filter.ContactId && t.IsActive && !t.IsDeleted);

        query = filter.Kind switch
        {
            KhataEntryKind.Gave => query.Where(t => !t.IsSoftDeleted && t.EntryType == GaveType),
            KhataEntryKind.Got => query.Where(t => !t.IsSoftDeleted && t.EntryType == GotType),
            KhataEntryKind.Photos => query.Where(t => !t.IsSoftDeleted && photos.Any(a => a.TransactionId == t.Id)),
            KhataEntryKind.Deleted => query.Where(t => t.IsSoftDeleted),
            KhataEntryKind.Live => query.Where(t => !t.IsSoftDeleted),
            _ => query
        };

        if (filter.From is DateOnly from)
            query = query.Where(t => t.EntryDate >= from);

        if (filter.To is DateOnly to)
            query = query.Where(t => t.EntryDate <= to);

        return filter.Search is null ? query : Search(query, filter.Search.ToLowerInvariant(), filter.SearchContactName);
    }

    private Task AdjustBalanceAsync(int contactId, long balanceDelta, CancellationToken cancellationToken)
    {
        return _dbContext.KhataContacts.Where(c => c.Id == contactId).ExecuteUpdateAsync(s => s.SetProperty(c => c.BalanceMinor, c => c.BalanceMinor + balanceDelta).SetProperty(c => c.ModifiedOn, DateTime.UtcNow), cancellationToken);
    }

    private static IQueryable<KhataTransaction> Sort(IQueryable<KhataTransaction> query, KhataEntrySort sort)
    {
        return sort switch
        {
            KhataEntrySort.Oldest => query.OrderBy(t => t.EntryDate).ThenBy(t => t.Id),
            KhataEntrySort.High => query.OrderByDescending(t => t.AmountMinor).ThenByDescending(t => t.EntryDate).ThenByDescending(t => t.Id),
            KhataEntrySort.Low => query.OrderBy(t => t.AmountMinor).ThenByDescending(t => t.EntryDate).ThenByDescending(t => t.Id),
            _ => query.OrderByDescending(t => t.EntryDate).ThenByDescending(t => t.Id)
        };
    }

    // Case-insensitive "contains" on the note, and on the contact's name when the list spans the whole book.
    private IQueryable<KhataTransaction> Search(IQueryable<KhataTransaction> query, string search, bool searchContactName)
    {
        var contacts = _dbContext.KhataContacts;

        return query.Where(t => (t.Note != null && t.Note.ToLower().Contains(search)) || (searchContactName && contacts.Any(c => c.Id == t.ContactId && c.Name.ToLower().Contains(search))));
    }

    // Adds the contact name, the photo count and the running balance: the contact's live entries up to this one (by EntryDate, then Id).
    private async Task<List<TransactionDto>> ToDtosAsync(IQueryable<KhataTransaction> query, int userId, CancellationToken cancellationToken)
    {
        var live = _dbContext.KhataTransactions.Where(x => x.IsActive && !x.IsDeleted && !x.IsSoftDeleted);
        var photos = _dbContext.KhataAttachments.WhereActive();
        var contacts = _dbContext.KhataContacts;

        var rows = await query.Select(t => new
        {
            Entry = t,
            ContactName = contacts.Where(c => c.Id == t.ContactId).Select(c => c.Name).FirstOrDefault(),
            PhotoCount = photos.Count(a => a.TransactionId == t.Id),
            BalanceAfterMinor = t.IsSoftDeleted ? null : live.Where(x => x.ContactId == t.ContactId && (x.EntryDate < t.EntryDate || (x.EntryDate == t.EntryDate && x.Id <= t.Id))).Sum(x => (long?)(x.EntryType == GaveType ? x.AmountMinor : -x.AmountMinor))
        }).ToListAsync(cancellationToken);

        return rows.Select(r => KhataMapper.ToDto(r.Entry, userId, r.ContactName, r.PhotoCount, r.BalanceAfterMinor)).ToList();
    }

    #endregion
}
