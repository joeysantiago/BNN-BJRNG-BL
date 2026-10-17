using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface ISettingsRepository
{
    Task<List<Feature>> GetFeaturesAsync(CancellationToken cancellationToken);

    Task<List<PageName>> GetPageNamesAsync(CancellationToken cancellationToken);

    Task<List<AppSetting>> GetAppSettingsAsync(CancellationToken cancellationToken);

    Task<List<ServiceItem>> GetServiceItemsAsync(CancellationToken cancellationToken);

    Task<string?> GetSettingValueAsync(string code, CancellationToken cancellationToken);

    Task<List<ConnectionField>> GetConnectionFieldsAsync(CancellationToken cancellationToken);

    Task UpdateAsync(Dictionary<string, bool> features, Dictionary<string, bool> fields, Dictionary<string, bool> services, Dictionary<string, string> appSettings, CancellationToken cancellationToken);
}
