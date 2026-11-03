using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IKhataStorageRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task<KhataStorageSetting?> GetAsync(CancellationToken cancellationToken);

    Task AddAsync(KhataStorageSetting setting, CancellationToken cancellationToken);
}
