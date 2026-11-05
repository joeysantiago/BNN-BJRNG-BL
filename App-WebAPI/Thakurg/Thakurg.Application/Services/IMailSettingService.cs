using Thakurg.Contracts.Mail;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IMailSettingService
{
    Task<List<MailSettingDto>> GetAllAsync(CancellationToken cancellationToken);

    Task<string> TestAsync(int userId, string purpose, CancellationToken cancellationToken);

    Task<ServiceResultDto<MailSettingDto>> SaveAsync(int userId, string purpose, MailSettingRequestDto request, CancellationToken cancellationToken);
}
