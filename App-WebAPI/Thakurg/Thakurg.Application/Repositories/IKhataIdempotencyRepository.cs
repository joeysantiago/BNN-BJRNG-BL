using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IKhataIdempotencyRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task RemoveAsync(int entryId, CancellationToken cancellationToken);

    Task DeleteExpiredAsync(DateTime now, CancellationToken cancellationToken);

    Task<bool> TryReserveAsync(KhataIdempotencyKey entry, CancellationToken cancellationToken);

    Task<KhataIdempotencyKey?> GetAsync(int userId, Guid idempotencyKey, CancellationToken cancellationToken);
}
