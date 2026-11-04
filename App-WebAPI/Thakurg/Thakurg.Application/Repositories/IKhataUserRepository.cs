using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IKhataUserRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task AddAuditAsync(KhataAuditLog entry, CancellationToken cancellationToken);

    Task<KhataUser?> GetUserAsync(int userId, CancellationToken cancellationToken);

    Task<bool> TryAddUserAsync(KhataUser user, CancellationToken cancellationToken);

    Task AddLockSessionAsync(KhataLockSession lockSession, CancellationToken cancellationToken);

    Task<KhataUser?> FindByAccountAsync(int accountUserId, CancellationToken cancellationToken);

    Task<KhataLockSession?> GetLockSessionAsync(int sessionId, CancellationToken cancellationToken);
}
