using Thakurg.Contracts.Khata;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IKhataBookRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task AddBookAsync(KhataBook book, CancellationToken cancellationToken);

    Task<int> CountBooksAsync(int userId, CancellationToken cancellationToken);

    Task<bool> BookHasEntriesAsync(int bookId, CancellationToken cancellationToken);

    Task AddCurrencyAsync(KhataCurrency currency, CancellationToken cancellationToken);

    Task SetLastBookAsync(int userId, int bookId, CancellationToken cancellationToken);

    Task<bool> IsCurrencyUsedAsync(int currencyId, CancellationToken cancellationToken);

    Task<int> CountCustomCurrenciesAsync(int userId, CancellationToken cancellationToken);

    Task<KhataBook?> GetBookAsync(int bookId, int userId, CancellationToken cancellationToken);

    Task<List<KhataCurrency>> GetCurrenciesAsync(int userId, CancellationToken cancellationToken);

    Task<KhataCurrency?> GetCurrencyAsync(int currencyId, int userId, CancellationToken cancellationToken);

    Task<bool> BookNameExistsAsync(int userId, string name, int? exceptBookId, CancellationToken cancellationToken);

    Task<bool> CurrencyCodeExistsAsync(int userId, string code, int? exceptCurrencyId, CancellationToken cancellationToken);

    Task<List<BookDto>> GetBookSummariesAsync(int userId, int? bookId, int? lastBookId, CancellationToken cancellationToken);
}
