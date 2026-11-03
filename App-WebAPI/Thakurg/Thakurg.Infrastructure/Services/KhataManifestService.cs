using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Khata;

namespace Thakurg.Infrastructure.Services;

// The SnapKhata web-app manifest (Khata:Manifest). Its name is the "khata" page name of the Settings master data (PageNames) in the asked language, else English.
// It is served by the API, so id, start_url, scope and the icons are made absolute on the site (Site:PublicUrl); relative ones would point at the API.
public class KhataManifestService : IKhataManifestService
{
    private readonly string _site;

    private const string Arabic = "ar";

    private const string Fallback = "en";

    private const string PageCode = "khata";

    private readonly KhataManifestOptions _manifest;

    private readonly IMessageService _messageService;

    private readonly ISettingsRepository _settingsRepository;

    private static readonly string[] Languages = ["en", "hi", "ar"];

    public KhataManifestService(IOptions<SiteOptions> site, IOptions<KhataOptions> options, IMessageService messageService, ISettingsRepository settingsRepository)
    {
        _site = site.Value.PublicUrl.TrimEnd('/');
        _manifest = options.Value.Manifest;
        _messageService = messageService;
        _settingsRepository = settingsRepository;
    }

    #region Public Methods

    public async Task<KhataManifestDto> BuildAsync(string? language, CancellationToken cancellationToken)
    {
        var asked = (language ?? string.Empty).Trim().ToLowerInvariant();
        var lang = Languages.Contains(asked) ? asked : _messageService.CurrentLanguage();
        var names = (await _settingsRepository.GetPageNamesAsync(cancellationToken)).Where(p => p.PageCode == PageCode).ToList();
        var name = names.FirstOrDefault(p => p.LanguageCode == lang)?.Name ?? names.FirstOrDefault(p => p.LanguageCode == Fallback)?.Name ?? string.Empty;
        var icons = _manifest.Icons.Select(i => new KhataManifestIconDto { Src = _site + i.Src, Sizes = i.Sizes, Type = i.Type, Purpose = i.Purpose }).ToList();

        return new KhataManifestDto { Id = _site + _manifest.Id, Name = name, ShortName = name, Lang = lang, Dir = lang == Arabic ? "rtl" : "ltr", StartUrl = _site + _manifest.StartUrl, Scope = _site + _manifest.Scope, Display = _manifest.Display, Orientation = _manifest.Orientation, BackgroundColor = _manifest.BackgroundColor, ThemeColor = _manifest.ThemeColor, Icons = icons };
    }

    #endregion
}
