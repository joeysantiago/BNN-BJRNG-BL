using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Settings;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Infrastructure.Services;

public class SettingsService : ISettingsService
{
    private readonly IMessageService _messageService;

    private readonly IMasterKeyService _masterKeyService;

    private readonly ISettingsRepository _settingsRepository;

    public SettingsService(IMessageService messageService, IMasterKeyService masterKeyService, ISettingsRepository settingsRepository)
    {
        _messageService = messageService;
        _masterKeyService = masterKeyService;
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

    public async Task<ServiceResultDto<AppSettingsDto>> SaveAsync(SettingsUpdateDto update, string? masterKey, CancellationToken cancellationToken)
    {
        await _masterKeyService.VerifyAsync(masterKey, cancellationToken);
        var current = await GetAsync(cancellationToken);
        var features = update.Features ?? new Dictionary<string, bool>();
        var fields = update.Connection?.Fields ?? new Dictionary<string, bool>();
        var items = update.Services?.Items ?? new Dictionary<string, bool>();

        RequireKnown(features.Keys, current.Features.Keys);
        RequireKnown(fields.Keys, current.Connection.Fields.Keys);
        RequireKnown(items.Keys, current.Services.Items.Select(i => i.Id));

        if (update.Services?.RefreshSeconds is < 0 or > 3600)
            throw new BusinessException(MessageCodes.SettingsInvalid, 400);

        var appSettings = new Dictionary<string, string>();

        if (update.Connection?.Enabled is { } connectionEnabled)
            appSettings["Connection.Enabled"] = ToText(connectionEnabled);

        if (update.Services?.Enabled is { } servicesEnabled)
            appSettings["Services.Enabled"] = ToText(servicesEnabled);

        if (update.Services?.RefreshSeconds is { } refreshSeconds)
            appSettings["Services.RefreshSeconds"] = refreshSeconds.ToString();

        await _settingsRepository.UpdateAsync(features, fields, items, appSettings, cancellationToken);

        return new ServiceResultDto<AppSettingsDto> { Data = await GetAsync(cancellationToken), Message = await _messageService.GetAsync(MessageCodes.SettingsSaved) };
    }

    #endregion

    #region Private Methods

    private static string ToText(bool value)
    {
        return value ? "true" : "false";
    }

    private static int ReadInt(Dictionary<string, string> values, string code, int fallback)
    {
        return values.TryGetValue(code, out var text) && int.TryParse(text, out var value) ? value : fallback;
    }

    private static void RequireKnown(IEnumerable<string> requested, IEnumerable<string> known)
    {
        if (requested.Except(known).Any())
            throw new BusinessException(MessageCodes.SettingsInvalid, 400);
    }

    private static bool ReadBool(Dictionary<string, string> values, string code, bool fallback)
    {
        return values.TryGetValue(code, out var text) && bool.TryParse(text, out var value) ? value : fallback;
    }

    #endregion
}
