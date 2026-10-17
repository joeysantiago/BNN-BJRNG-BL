using Thakurg.Contracts.Settings;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface ISettingsService
{
    Task<AppSettingsDto> GetAsync(CancellationToken cancellationToken);

    Task<ServiceResultDto<AppSettingsDto>> SaveAsync(SettingsUpdateDto update, string? masterKey, CancellationToken cancellationToken);
}
