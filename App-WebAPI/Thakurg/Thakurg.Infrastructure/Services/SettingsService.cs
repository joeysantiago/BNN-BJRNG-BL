using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Settings;

namespace Thakurg.Infrastructure.Services;

public class SettingsService : ISettingsService
{
    private readonly ISettingsRepository _settingsRepository;

    public SettingsService(ISettingsRepository settingsRepository)
    {
        _settingsRepository = settingsRepository;
    }

    #region Public Methods

    public async Task<AppSettingsDto> GetAsync(CancellationToken cancellationToken)
    {
        var features = await _settingsRepository.GetFeaturesAsync(cancellationToken);
        var pageNames = await _settingsRepository.GetPageNamesAsync(cancellationToken);
        var settings = (await _settingsRepository.GetAppSettingsAsync(cancellationToken)).ToDictionary(s => s.Code, s => s.Value);
        var fields = await _settingsRepository.GetConnectionFieldsAsync(cancellationToken);
        var items = await _settingsRepository.GetServiceItemsAsync(cancellationToken);

        return new AppSettingsDto
        {
            Features = features.ToDictionary(f => f.Code, f => f.IsEnabled),
            PageNames = pageNames.GroupBy(p => p.PageCode).ToDictionary(g => g.Key, g => g.ToDictionary(p => p.LanguageCode, p => p.Name)),
            Connection = new ConnectionSettingsDto { Enabled = ReadBool(settings, "Connection.Enabled", true), Fields = fields.ToDictionary(f => f.Code, f => f.IsEnabled) },
            Services = new ServicesSettingsDto
            {
                Enabled = ReadBool(settings, "Services.Enabled", true),
                RefreshSeconds = ReadInt(settings, "Services.RefreshSeconds", 120),
                Items = items.Select(i => new ServiceItemDto { Id = i.Code, Name = i.Name, Group = i.GroupCode, Enabled = i.IsEnabled, Url = i.Url, ProbeUrl = i.ProbeUrl, StatusPage = i.StatusPageUrl }).ToList()
            }
        };
    }

    #endregion

    #region Private Methods

    private static int ReadInt(Dictionary<string, string> values, string code, int fallback)
    {
        return values.TryGetValue(code, out var text) && int.TryParse(text, out var value) ? value : fallback;
    }

    private static bool ReadBool(Dictionary<string, string> values, string code, bool fallback)
    {
        return values.TryGetValue(code, out var text) && bool.TryParse(text, out var value) ? value : fallback;
    }

    #endregion
}
