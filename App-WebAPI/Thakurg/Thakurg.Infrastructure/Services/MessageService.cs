using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;

namespace Thakurg.Infrastructure.Services;

public class MessageService : IMessageService
{
    private readonly IMemoryCache _cache;

    private const string CacheKey = "messages";

    private const string FallbackLanguage = "en";

    private readonly IMessageRepository _messageRepository;

    private readonly IHttpContextAccessor _httpContextAccessor;

    public MessageService(IMemoryCache cache, IHttpContextAccessor httpContextAccessor, IMessageRepository messageRepository)
    {
        _cache = cache;
        _httpContextAccessor = httpContextAccessor;
        _messageRepository = messageRepository;
    }

    #region Public Methods

    public async Task<string> GetAsync(string code, params object[] arguments)
    {
        var messages = await LoadAsync();

        if (!messages.TryGetValue(code, out var texts))
            return code;

        var text = texts.GetValueOrDefault(ResolveLanguage(texts)) ?? texts.GetValueOrDefault(FallbackLanguage) ?? code;

        return arguments.Length == 0 ? text : string.Format(text, arguments);
    }

    #endregion

    #region Private Methods

    private string ResolveLanguage(Dictionary<string, string> texts)
    {
        var header = _httpContextAccessor.HttpContext?.Request.Headers.AcceptLanguage.ToString() ?? string.Empty;

        foreach (var part in header.Split(','))
        {
            var tag = part.Split(';')[0].Trim().Split('-')[0].ToLowerInvariant();

            if (texts.ContainsKey(tag))
                return tag;
        }

        return FallbackLanguage;
    }

    private async Task<Dictionary<string, Dictionary<string, string>>> LoadAsync()
    {
        var messages = await _cache.GetOrCreateAsync(CacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
            var rows = await _messageRepository.GetAllAsync(CancellationToken.None);

            return rows.ToDictionary(r => r.Code, r => JsonSerializer.Deserialize<Dictionary<string, string>>(r.Texts) ?? new Dictionary<string, string>());
        });

        return messages ?? new Dictionary<string, Dictionary<string, string>>();
    }

    #endregion
}
