using Thakurg.Contracts.WhatsApp;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IWhatsAppSettingService
{
    Task<WhatsAppSettingDto> GetAsync(CancellationToken cancellationToken);

    Task<string> TestAsync(WhatsAppTestRequestDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<WhatsAppSettingDto>> SaveAsync(int userId, WhatsAppSettingRequestDto request, CancellationToken cancellationToken);
}
