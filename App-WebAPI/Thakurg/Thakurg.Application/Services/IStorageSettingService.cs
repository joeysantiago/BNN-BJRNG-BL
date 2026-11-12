using Thakurg.Contracts.Storage;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IStorageSettingService
{
    Task<string> TestAsync(CancellationToken cancellationToken);

    Task<StorageSettingDto> GetAsync(CancellationToken cancellationToken);

    Task<string> CopyAsync(string target, CancellationToken cancellationToken);

    Task<ServiceResultDto<StorageSettingDto>> SaveAsync(StorageSettingRequestDto request, CancellationToken cancellationToken);
}
