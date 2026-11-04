using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IKhataPinService
{
    Task<KhataPinStatusDto> GetAsync(KhataCallerDto caller, CancellationToken cancellationToken);

    Task<KhataPinStatusDto> VerifyAsync(KhataCallerDto caller, KhataPinRequestDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<KhataPinStatusDto>> SetAsync(KhataCallerDto caller, KhataPinRequestDto request, CancellationToken cancellationToken);
}
