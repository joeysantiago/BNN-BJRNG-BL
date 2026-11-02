using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IAuthService
{
    Task<UserDto> GetMeAsync(int userId, CancellationToken cancellationToken);

    Task<string> LogoutAsync(AuthCallerDto caller, CancellationToken cancellationToken);

    Task<SignInDto> RefreshAsync(string? refreshToken, AuthCallerDto caller, CancellationToken cancellationToken);

    Task<SignInDto> LoginAsync(LoginRequestDto request, AuthCallerDto caller, CancellationToken cancellationToken);

    Task<SignInDto> RegisterAsync(RegisterRequestDto request, AuthCallerDto caller, CancellationToken cancellationToken);

    Task<string> ChangePasswordAsync(PasswordChangeDto request, AuthCallerDto caller, CancellationToken cancellationToken);

    Task<ServiceResultDto<UserDto>> UpdateProfileAsync(int userId, ProfileUpdateDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<UserDto>> UpdateFeaturesAsync(int userId, FeaturePreferencesDto request, CancellationToken cancellationToken);
}
