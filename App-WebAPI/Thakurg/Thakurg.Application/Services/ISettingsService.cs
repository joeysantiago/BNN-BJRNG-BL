using Thakurg.Contracts.Settings;

namespace Thakurg.Application.Services;

public interface ISettingsService
{
    Task<AppSettingsDto> GetAsync(CancellationToken cancellationToken);
}
