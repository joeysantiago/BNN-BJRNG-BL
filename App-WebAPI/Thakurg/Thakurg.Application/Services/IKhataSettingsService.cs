using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IKhataSettingsService
{
    Task<KhataSettingsDto> GetAsync(KhataCallerDto caller, CancellationToken cancellationToken);

    Task<ServiceResultDto<KhataSettingsDto>> SaveAsync(KhataCallerDto caller, KhataSettingsRequestDto request, CancellationToken cancellationToken);
}
