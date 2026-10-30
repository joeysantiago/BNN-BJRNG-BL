using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

public interface IKhataPinService
{
    Task<KhataAuthResultDto> SetAsync(KhataCallerDto caller, string? pin, CancellationToken cancellationToken);

    Task<KhataAuthResultDto> UnlockAsync(KhataCallerDto caller, string? pin, CancellationToken cancellationToken);

    Task<string> ChangeAsync(KhataCallerDto caller, string? newPin, string? proof, CancellationToken cancellationToken);

    Task<PinProofDto> CreateProofAsync(KhataCallerDto caller, PinProofRequestDto request, CancellationToken cancellationToken);

    Task ConsumeProofAsync(KhataCallerDto caller, KhataPinPurpose purpose, int? targetId, string? proof, CancellationToken cancellationToken);
}
