using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Contracts.Khata;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class KhataBookRepository : IKhataBookRepository
{
    private readonly ICommonDbContext _dbContext;

    public KhataBookRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<int> CountBooksAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataBooks.WhereActive().CountAsync(b => b.OwnerUserId == userId, cancellationToken);
    }

    public async Task AddBookAsync(KhataBook book, CancellationToken cancellationToken)
    {
        _dbContext.KhataBooks.Add(book);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<bool> BookHasEntriesAsync(int bookId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataTransactions.AnyAsync(t => t.BookId == bookId && !t.IsDeleted, cancellationToken);
    }

    public Task SetLastBookAsync(int userId, int bookId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataUsers.Where(u => u.Id == userId).ExecuteUpdateAsync(s => s.SetProperty(u => u.LastBookId, bookId), cancellationToken);
    }

    public Task<bool> IsCurrencyUsedAsync(int currencyId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataBooks.WhereActive().AnyAsync(b => b.CurrencyId == currencyId, cancellationToken);
    }

    public Task<int> CountCustomCurrenciesAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataCurrencies.WhereActive().CountAsync(c => c.OwnerUserId == userId, cancellationToken);
    }

    public async Task AddCurrencyAsync(KhataCurrency currency, CancellationToken cancellationToken)
    {
        _dbContext.KhataCurrencies.Add(currency);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<KhataBook?> GetBookAsync(int bookId, int userId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataBooks.WhereActive().FirstOrDefaultAsync(b => b.Id == bookId && b.OwnerUserId == userId, cancellationToken);
    }

    // Built-in money types (no owner) first, then the user's own.
    public Task<List<KhataCurrency>> GetCurrenciesAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataCurrencies.AsNoTracking().WhereActive().Where(c => c.OwnerUserId == null || c.OwnerUserId == userId).OrderBy(c => c.OwnerUserId != null).ThenBy(c => c.SortOrder).ThenBy(c => c.Name).ToListAsync(cancellationToken);
    }

    public Task<KhataCurrency?> GetCurrencyAsync(int currencyId, int userId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataCurrencies.WhereActive().FirstOrDefaultAsync(c => c.Id == currencyId && (c.OwnerUserId == null || c.OwnerUserId == userId), cancellationToken);
    }

    public Task<bool> BookNameExistsAsync(int userId, string name, int? exceptBookId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataBooks.WhereActive().AnyAsync(b => b.OwnerUserId == userId && b.Name == name && b.Id != exceptBookId, cancellationToken);
    }

    public Task<bool> CurrencyCodeExistsAsync(int userId, string code, int? exceptCurrencyId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataCurrencies.WhereActive().AnyAsync(c => (c.OwnerUserId == null || c.OwnerUserId == userId) && c.Code == code && c.Id != exceptCurrencyId, cancellationToken);
    }

    // Totals come from the cached contact balances: positive = you will get, negative = you will give.
    public Task<List<BookDto>> GetBookSummariesAsync(int userId, int? bookId, int? lastBookId, CancellationToken cancellationToken)
    {
        var contacts = _dbContext.KhataContacts.WhereActive();

        return _dbContext.KhataBooks.AsNoTracking().WhereActive().Where(b => b.OwnerUserId == userId && (bookId == null || b.Id == bookId)).OrderBy(b => b.SortOrder).ThenBy(b => b.Name)
            .Join(_dbContext.KhataCurrencies, b => b.CurrencyId, c => c.Id, (b, c) => new BookDto
            {
                Id = b.Id,
                Name = b.Name,
                Currency = new CurrencyDto { Id = c.Id, Code = c.Code, Symbol = c.Symbol, Name = c.Name, Decimals = c.Decimals, IsIso = c.IsIso, IsCustom = c.OwnerUserId != null },
                ContactCount = contacts.Count(k => k.BookId == b.Id),
                YouWillGetMinor = contacts.Where(k => k.BookId == b.Id && k.BalanceMinor > 0).Sum(k => (long?)k.BalanceMinor) ?? 0,
                YouWillGiveMinor = contacts.Where(k => k.BookId == b.Id && k.BalanceMinor < 0).Sum(k => (long?)-k.BalanceMinor) ?? 0,
                HasEntries = _dbContext.KhataTransactions.Any(t => t.BookId == b.Id && !t.IsDeleted),
                IsLastOpened = b.Id == lastBookId
            })
            .ToListAsync(cancellationToken);
    }

    #endregion
}
