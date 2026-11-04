using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Apps;
using Thakurg.Contracts.Configurations;

namespace Thakurg.Infrastructure.Services;

// The web-app manifest of one app (AppManifests:Apps:<code>). Its name is the app's page name of the Settings master data (PageNames) in the asked
// language, else English. It is served by the API, so id, start_url, scope and the icons are made absolute on the site (Site:PublicUrl); relative ones would point at the API.
public class AppManifestService : IAppManifestService
{
    private readonly string _site;

    private const string Arabic = "ar";

    private const string Fallback = "en";

    private readonly AppManifestOptions _options;

    private readonly IMessageService _messageService;

    private readonly ISettingsRepository _settingsRepository;

    private static readonly string[] Languages = ["en", "hi", "ar"];

    public AppManifestService(IOptions<SiteOptions> site, IOptions<AppManifestOptions> options, IMessageService messageService, ISettingsRepository settingsRepository)
    {
        _site = site.Value.PublicUrl.TrimEnd('/');
        _options = options.Value;
        _messageService = messageService;
        _settingsRepository = settingsRepository;
    }

    #region Public Methods

    // Null when this branch does not list the app.
    public async Task<AppManifestDto?> BuildAsync(string appCode, string? language, CancellationToken cancellationToken)
    {
        var code = appCode.Trim().ToLowerInvariant();
        if (!_options.Apps.TryGetValue(code, out var manifest))
            return null;
        var asked = (language ?? string.Empty).Trim().ToLowerInvariant();
        var lang = Languages.Contains(asked) ? asked : _messageService.CurrentLanguage();
        var names = (await _settingsRepository.GetPageNamesAsync(cancellationToken)).Where(p => p.PageCode == code).ToList();
        var name = names.FirstOrDefault(p => p.LanguageCode == lang)?.Name ?? names.FirstOrDefault(p => p.LanguageCode == Fallback)?.Name ?? string.Empty;
        var icons = manifest.Icons.Select(i => new AppManifestIconDto { Src = _site + i.Src, Sizes = i.Sizes, Type = i.Type, Purpose = i.Purpose }).ToList();
        return new AppManifestDto { Id = _site + manifest.Id, Name = name, ShortName = name, Lang = lang, Dir = lang == Arabic ? "rtl" : "ltr", StartUrl = _site + manifest.StartUrl, Scope = _site + manifest.Scope, Display = manifest.Display, Orientation = manifest.Orientation, BackgroundColor = manifest.BackgroundColor, ThemeColor = manifest.ThemeColor, Icons = icons };
    }

    #endregion
}
