using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IOtpService
{
    Task<SignInDto> VerifyAsync(OtpVerifyRequestDto request, AuthCallerDto caller, CancellationToken cancellationToken);

    Task<ServiceResultDto<OtpRequestDto>> RequestAsync(OtpCodeRequestDto request, AuthCallerDto caller, CancellationToken cancellationToken);

    (string Channel, string Destination) Normalize(string? channel, string? destination);

    Task ConsumeCodeAsync(string channel, string destination, string app, string? plainCode, CancellationToken cancellationToken);

    Task<OtpRequestDto> SendCodeAsync(string channel, string destination, string app, AuthCallerDto caller, CancellationToken cancellationToken);
}
