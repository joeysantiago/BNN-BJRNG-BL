using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface ISignupService
{
    Task<SignInDto> RegisterAsync(RegisterRequestDto request, AuthCallerDto caller, CancellationToken cancellationToken);

    Task<ServiceResultDto<OtpRequestDto>> RequestCodeAsync(SignupCodeRequestDto request, AuthCallerDto caller, CancellationToken cancellationToken);
}
