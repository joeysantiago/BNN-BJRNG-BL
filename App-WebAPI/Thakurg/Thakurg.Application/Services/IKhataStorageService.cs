using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IKhataStorageService
{
    Task<string> TestAsync(CancellationToken cancellationToken);

    Task<KhataStorageDto> GetAsync(CancellationToken cancellationToken);

    Task<ServiceResultDto<KhataStorageDto>> SaveAsync(int accountUserId, KhataStorageRequestDto request, CancellationToken cancellationToken);
}
