using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IKhataPinService
{
    Task EnsureUnlockedAsync(KhataCallerDto caller, CancellationToken cancellationToken);

    Task<KhataPinStatusDto> GetAsync(KhataCallerDto caller, CancellationToken cancellationToken);

    Task<KhataPinStatusDto> VerifyAsync(KhataCallerDto caller, KhataPinRequestDto request, CancellationToken cancellationToken);

    Task<KhataPinStatusDto> LockAsync(KhataCallerDto caller, KhataPinLockRequestDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<KhataPinStatusDto>> SetAsync(KhataCallerDto caller, KhataPinRequestDto request, CancellationToken cancellationToken);
}
