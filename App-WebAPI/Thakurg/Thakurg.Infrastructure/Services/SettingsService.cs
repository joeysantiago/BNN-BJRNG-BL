using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Settings;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Infrastructure.Services;

public class SettingsService : ISettingsService
{
    private const int NameLength = 40;

    private readonly IMessageService _messageService;

    private const string GaugeStopsCode = "Speed.GaugeStops";

    private readonly ISettingsRepository _settingsRepository;

    private static readonly string[] Languages = ["en", "hi", "ar"];

    private static readonly int[] DefaultStops = [0, 5, 10, 25, 50, 75, 100, 250, 500, 1000, 2500, 5000, 10000];

    private static readonly string[] SignupChannels = [OtpChannels.Email, OtpChannels.WhatsApp, OtpChannels.Sms];

    public SettingsService(IMessageService messageService, ISettingsRepository settingsRepository)
    {
        _messageService = messageService;
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
            Speed = new SpeedSettingsDto { GaugeStops = ReadStops(settings) },
            SignupVerification = settings.TryGetValue(SettingCodes.SignupVerification, out var signup) && SignupChannels.Contains(signup) ? signup : OtpChannels.Email,
            Connection = new ConnectionSettingsDto { Enabled = ReadBool(settings, "Connection.Enabled", true), Fields = fields.ToDictionary(f => f.Code, f => f.IsEnabled) },
            Services = new ServicesSettingsDto
            {
                Enabled = ReadBool(settings, "Services.Enabled", true),
                RefreshSeconds = ReadInt(settings, "Services.RefreshSeconds", 120),
                Items = items.Select(i => new ServiceItemDto { Id = i.Code, Name = i.Name, Group = i.GroupCode, Enabled = i.IsEnabled, Url = i.Url, ProbeUrl = i.ProbeUrl, StatusPage = i.StatusPageUrl }).ToList()
            }
        };
    }

    public async Task<ServiceResultDto<AppSettingsDto>> SaveAsync(SettingsUpdateDto update, CancellationToken cancellationToken)
    {
        var current = await GetAsync(cancellationToken);
        var features = update.Features ?? new Dictionary<string, bool>();
        var fields = update.Connection?.Fields ?? new Dictionary<string, bool>();
        var items = update.Services?.Items ?? new Dictionary<string, bool>();

        RequireKnown(features.Keys, current.Features.Keys);
        RequireKnown(fields.Keys, current.Connection.Fields.Keys);
        RequireKnown(items.Keys, current.Services.Items.Select(i => i.Id));

        if (update.Services?.RefreshSeconds is < 0 or > 3600)
            throw new BusinessException(MessageCodes.SettingsInvalid, 400);

        if (update.Speed?.GaugeStops is { } stops && !IsValidStops(stops))
            throw new BusinessException(MessageCodes.SettingsInvalid, 400);

        var appSettings = new Dictionary<string, string>();

        if (update.Speed?.GaugeStops is { } gaugeStops)
            appSettings[GaugeStopsCode] = string.Join(',', gaugeStops);

        if (update.Connection?.Enabled is { } connectionEnabled)
            appSettings["Connection.Enabled"] = ToText(connectionEnabled);

        if (update.Services?.Enabled is { } servicesEnabled)
            appSettings["Services.Enabled"] = ToText(servicesEnabled);

        if (update.Services?.RefreshSeconds is { } refreshSeconds)
            appSettings["Services.RefreshSeconds"] = refreshSeconds.ToString();

        await _settingsRepository.UpdateAsync(features, fields, items, appSettings, cancellationToken);

        return new ServiceResultDto<AppSettingsDto> { Data = await GetAsync(cancellationToken), Message = await _messageService.GetAsync(MessageCodes.SettingsSaved) };
    }

    // The controller lets only a super admin in. WhatsApp and SMS need their sender set up (Settings > Keys); a sign-up then also asks for the mobile number.
    public async Task<ServiceResultDto<AppSettingsDto>> SaveSignupVerificationAsync(SignupVerificationUpdateDto request, CancellationToken cancellationToken)
    {
        var channel = (request.Channel ?? string.Empty).Trim().ToLowerInvariant();

        if (!SignupChannels.Contains(channel))
            throw new BusinessException(MessageCodes.SettingsInvalid, 400);

        await _settingsRepository.UpdateAsync([], [], [], new Dictionary<string, string> { [SettingCodes.SignupVerification] = channel }, cancellationToken);

        return new ServiceResultDto<AppSettingsDto> { Data = await GetAsync(cancellationToken), Message = await _messageService.GetAsync(MessageCodes.SettingsSaved) };
    }

    // The controller lets only a super admin in. English is required; a Hindi or Arabic name left empty keeps the one it has. Only a page that already has names can be renamed.
    public async Task<ServiceResultDto<Dictionary<string, string>>> RenameAsync(int userId, string pageCode, AppNameUpdateDto request, CancellationToken cancellationToken)
    {
        var names = request.Names.Where(n => !string.IsNullOrWhiteSpace(n.Value)).ToDictionary(n => n.Key, n => n.Value.Trim());

        if (!names.ContainsKey("en") || names.Keys.Any(k => !Languages.Contains(k)) || names.Values.Any(v => v.Length > NameLength))
            throw new BusinessException(MessageCodes.AppNameInvalid, 400, NameLength);

        if ((await _settingsRepository.GetPageNamesAsync(cancellationToken)).All(p => p.PageCode != pageCode))
            throw new BusinessException(MessageCodes.SettingsInvalid, 400);

        await _settingsRepository.SavePageNamesAsync(pageCode, names, userId, cancellationToken);
        var saved = (await _settingsRepository.GetPageNamesAsync(cancellationToken)).Where(p => p.PageCode == pageCode).ToDictionary(p => p.LanguageCode, p => p.Name);

        return new ServiceResultDto<Dictionary<string, string>> { Data = saved, Message = await _messageService.GetAsync(MessageCodes.AppNameSaved) };
    }

    #endregion

    #region Private Methods

    private static string ToText(bool value)
    {
        return value ? "true" : "false";
    }

    /// <summary>Speeds (Mbps) printed on the speed test gauge: 2 to 20 values, the first 0, each larger than the one before, at most 100000.</summary>
    private static bool IsValidStops(List<int> stops)
    {
        return stops.Count is >= 2 and <= 20 && stops[0] == 0 && stops[^1] <= 100000 && stops.Zip(stops.Skip(1), (a, b) => b > a).All(ok => ok);
    }

    private static List<int> ReadStops(Dictionary<string, string> values)
    {
        var stops = values.TryGetValue(GaugeStopsCode, out var text) ? text.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(s => int.TryParse(s, out var n) ? n : -1).ToList() : [];

        return IsValidStops(stops) ? stops : [..DefaultStops];
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
