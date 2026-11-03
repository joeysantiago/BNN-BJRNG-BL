using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

// What a party message needs (the entry, its contact, the book's money type, the owner) and the log of every attempt.
public interface IKhataNotificationRepository
{
    Task<KhataUser?> GetOwnerAsync(int userId, CancellationToken cancellationToken);

    Task<KhataContact?> GetContactAsync(int contactId, CancellationToken cancellationToken);

    Task<string?> GetCompanyNameAsync(int accountUserId, CancellationToken cancellationToken);

    Task<KhataCurrency?> GetBookCurrencyAsync(int bookId, CancellationToken cancellationToken);

    Task<KhataNotificationPref?> GetPrefAsync(int contactId, CancellationToken cancellationToken);

    Task AddLogsAsync(IEnumerable<KhataNotificationLog> logs, CancellationToken cancellationToken);

    Task<KhataTransaction?> GetTransactionAsync(int transactionId, CancellationToken cancellationToken);
}
