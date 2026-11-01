using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IKhataUserRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task AddUserAsync(KhataUser user, CancellationToken cancellationToken);

    Task AddAuditAsync(KhataAuditLog entry, CancellationToken cancellationToken);

    Task<KhataUser?> GetUserAsync(int userId, CancellationToken cancellationToken);

    Task<KhataUser?> FindByAccountAsync(int accountUserId, CancellationToken cancellationToken);
}
