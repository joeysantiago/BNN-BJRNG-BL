using Thakurg.Contracts.Khata;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IKhataTransactionRepository
{
    Task<int> CountLiveEntriesAsync(int bookId, CancellationToken cancellationToken);

    Task<KhataTransaction?> GetTransactionAsync(int transactionId, CancellationToken cancellationToken);

    Task<KhataTransaction?> GetAnyTransactionAsync(int transactionId, CancellationToken cancellationToken);

    Task<TransactionDto?> GetEntryAsync(int transactionId, int userId, CancellationToken cancellationToken);

    Task<List<KhataTransactionHistory>> GetHistoryAsync(int transactionId, CancellationToken cancellationToken);

    Task<List<BookMonthDto>> GetMonthTotalsAsync(int bookId, DateOnly from, DateOnly to, CancellationToken cancellationToken);

    Task AddAsync(KhataTransaction entry, KhataTransactionHistory history, long balanceDelta, CancellationToken cancellationToken);

    Task<bool> UpdateAsync(KhataTransaction entry, byte[] expectedRowVersion, KhataTransactionHistory history, long balanceDelta, CancellationToken cancellationToken);

    Task<(List<TransactionDto> Items, int Total, long GaveMinor, long GotMinor)> GetPageAsync(TransactionFilterDto filter, int userId, CancellationToken cancellationToken);
}
