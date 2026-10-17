using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

public class TranslationService : ITranslationService
{
    private readonly IMemoryCache _cache;

    private const string CacheKey = "translations";

    private readonly ITranslationRepository _translationRepository;

    public TranslationService(IMemoryCache cache, ITranslationRepository translationRepository)
    {
        _cache = cache;
        _translationRepository = translationRepository;
    }

    #region Public Methods

    public async Task<Dictionary<string, string>> GetAsync(string language, string? pages, CancellationToken cancellationToken)
    {
        var code = language.ToLowerInvariant();

        if (code is not ("en" or "hi" or "ar"))
            throw new BusinessException(MessageCodes.TranslationLanguageInvalid, 400);

        var wanted = (pages ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(p => p.ToLowerInvariant()).ToHashSet();
        var rows = (await LoadAsync(cancellationToken)).Where(r => wanted.Count == 0 || wanted.Contains(r.PageCode.ToLowerInvariant()));
        var result = new Dictionary<string, string>();

        foreach (var row in rows)
        {
            foreach (var (key, text) in Parse(row.Eng))
                result[key] = text;

            foreach (var (key, text) in Parse(code == "hi" ? row.Hin : code == "ar" ? row.Arab : "{}"))
                if (!string.IsNullOrWhiteSpace(text))
                    result[key] = text;
        }

        return result;
    }

    #endregion

    #region Private Methods

    private static Dictionary<string, string> Parse(string json)
    {
        return JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new Dictionary<string, string>();
    }

    private async Task<List<PageTranslation>> LoadAsync(CancellationToken cancellationToken)
    {
        var rows = await _cache.GetOrCreateAsync(CacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);

            return await _translationRepository.GetActiveAsync(cancellationToken);
        });

        return rows ?? new List<PageTranslation>();
    }

    #endregion
}
