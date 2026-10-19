using Thakurg.Contracts.Settings;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface ISettingsService
{
    Task<AppSettingsDto> GetAsync(CancellationToken cancellationToken);

    Task<bool> IsMasterKeySetAsync(CancellationToken cancellationToken);

    Task UnlockAsync(string? masterKey, CancellationToken cancellationToken);

    Task<string> CreateMasterKeyAsync(string? password, string? confirm, CancellationToken cancellationToken);

    Task<ServiceResultDto<AppSettingsDto>> SaveAsync(SettingsUpdateDto update, string? masterKey, CancellationToken cancellationToken);
}
