using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IMailSettingRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task AddAsync(MailSetting setting, CancellationToken cancellationToken);

    Task<List<MailSetting>> GetAllAsync(CancellationToken cancellationToken);

    Task<MailSetting?> GetAsync(string purpose, CancellationToken cancellationToken);
}
