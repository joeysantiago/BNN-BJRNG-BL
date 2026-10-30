using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IKhataTransactionRepository
{
    Task<KhataTransaction?> GetTransactionAsync(int transactionId, CancellationToken cancellationToken);

    Task<List<KhataTransactionHistory>> GetHistoryAsync(int transactionId, CancellationToken cancellationToken);

    Task AddAsync(KhataTransaction entry, KhataTransactionHistory history, long balanceDelta, CancellationToken cancellationToken);

    Task<(List<KhataTransaction> Items, int Total)> GetPageAsync(int contactId, int page, int pageSize, CancellationToken cancellationToken);

    Task<bool> UpdateAsync(KhataTransaction entry, byte[] expectedRowVersion, KhataTransactionHistory history, long balanceDelta, CancellationToken cancellationToken);
}
