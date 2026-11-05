using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IWhatsAppSettingRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task<WhatsAppSetting?> GetAsync(CancellationToken cancellationToken);

    Task<WhatsAppSetting?> ReadAsync(CancellationToken cancellationToken);

    Task AddAsync(WhatsAppSetting setting, CancellationToken cancellationToken);
}
