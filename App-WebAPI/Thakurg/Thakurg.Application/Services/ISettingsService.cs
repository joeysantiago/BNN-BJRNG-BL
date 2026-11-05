using Thakurg.Contracts.Settings;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface ISettingsService
{
    Task<AppSettingsDto> GetAsync(CancellationToken cancellationToken);

    Task<ServiceResultDto<AppSettingsDto>> SaveAsync(SettingsUpdateDto update, CancellationToken cancellationToken);

    Task<ServiceResultDto<AppSettingsDto>> SaveSignupVerificationAsync(SignupVerificationUpdateDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<Dictionary<string, string>>> RenameAsync(int userId, string pageCode, AppNameUpdateDto request, CancellationToken cancellationToken);
}
