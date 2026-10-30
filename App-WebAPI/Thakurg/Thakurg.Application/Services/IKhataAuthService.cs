using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

public interface IKhataAuthService
{
    Task<string> LogoutAsync(KhataCallerDto caller, CancellationToken cancellationToken);

    Task<KhataAuthResultDto> RenewAsync(KhataCallerDto caller, CancellationToken cancellationToken);

    Task<string> SendOtpAsync(OtpSendRequestDto request, KhataCallerDto caller, CancellationToken cancellationToken);

    Task<KhataSignInDto> RefreshAsync(string? refreshToken, KhataCallerDto caller, CancellationToken cancellationToken);

    Task<KhataSignInDto> VerifyOtpAsync(OtpVerifyRequestDto request, KhataCallerDto caller, CancellationToken cancellationToken);
}
