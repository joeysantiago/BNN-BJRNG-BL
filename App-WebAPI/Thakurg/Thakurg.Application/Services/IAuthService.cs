using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IAuthService
{
    Task<UserDto> GetMeAsync(int userId, CancellationToken cancellationToken);

    Task<List<QuickLoginDto>> GetQuickLoginsAsync(CancellationToken cancellationToken);

    Task<UserDto> GetMeAsync(AuthCallerDto caller, CancellationToken cancellationToken);

    Task<string> LogoutAsync(AuthCallerDto caller, CancellationToken cancellationToken);

    Task<string> DeleteAccountAsync(AuthCallerDto caller, CancellationToken cancellationToken);

    Task RequireOtpAccountAsync(string channel, string destination, CancellationToken cancellationToken);

    Task<SignInDto> QuickLoginAsync(int userId, AuthCallerDto caller, CancellationToken cancellationToken);

    Task<SignInDto> RefreshAsync(string? refreshToken, AuthCallerDto caller, CancellationToken cancellationToken);

    Task<SignInDto> LoginAsync(LoginRequestDto request, AuthCallerDto caller, CancellationToken cancellationToken);

    Task<SignInDto> RegisterAsync(RegisterRequestDto request, AuthCallerDto caller, CancellationToken cancellationToken);

    Task<string> ChangePasswordAsync(PasswordChangeDto request, AuthCallerDto caller, CancellationToken cancellationToken);

    Task<SignInDto> OtpSignInAsync(string channel, string destination, AuthCallerDto caller, CancellationToken cancellationToken);

    Task<ServiceResultDto<UserDto>> UpdateProfileAsync(AuthCallerDto caller, ProfileUpdateDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<UserDto>> UpdateFeaturesAsync(AuthCallerDto caller, FeaturePreferencesDto request, CancellationToken cancellationToken);
}
