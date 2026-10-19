using System.Text.Json;
using System.Xml;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.YouTube;

namespace Thakurg.Infrastructure.Services;

public class YoutubeDataApi : IYoutubeDataApi
{
    private readonly HttpClient _http;

    public const string KeyCode = "Youtube.ApiKey";

    private readonly ISettingsRepository _settingsRepository;

    private const string BaseUrl = "https://www.googleapis.com/youtube/v3/";

    public YoutubeDataApi(HttpClient http, ISettingsRepository settingsRepository)
    {
        _http = http;
        _settingsRepository = settingsRepository;
    }

    #region Public Methods

    public async Task<bool> IsConfiguredAsync(CancellationToken cancellationToken)
    {
        return !string.IsNullOrEmpty(await _settingsRepository.GetSettingValueAsync(KeyCode, cancellationToken));
    }

    public async Task<bool> IsValidKeyAsync(string key, CancellationToken cancellationToken)
    {
        try
        {
            using var answer = await GetAsync("videos?part=id&id=dQw4w9WgXcQ", key, cancellationToken);

            return true;
        }
        catch (HttpRequestException)
        {
            return false;
        }
    }

    public async Task<YoutubeVideoDto?> GetVideoAsync(string videoId, CancellationToken cancellationToken)
    {
        var key = await GetKeyAsync(cancellationToken);

        return key is null ? null : (await FetchVideosAsync([videoId], key, cancellationToken)).FirstOrDefault();
    }

    public async Task<List<YoutubeVideoDto>?> SearchAsync(string text, int max, CancellationToken cancellationToken)
    {
        var key = await GetKeyAsync(cancellationToken);

        if (key is null)
            return null;

        using var found = await GetAsync($"search?part=id&type=video&maxResults={Math.Clamp(max, 1, 50)}&q={Uri.EscapeDataString(text)}", key, cancellationToken);
        var ids = found.RootElement.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("id").GetProperty("videoId").GetString()!).ToList();

        return await FetchVideosAsync(ids, key, cancellationToken);
    }

    public async Task<List<YoutubeVideoDto>?> GetPlaylistAsync(string listId, int max, CancellationToken cancellationToken)
    {
        var key = await GetKeyAsync(cancellationToken);

        if (key is null)
            return null;

        var ids = new List<string>();
        string? page = null;

        do
        {
            var token = page is null ? string.Empty : $"&pageToken={Uri.EscapeDataString(page)}";
            using var items = await GetAsync($"playlistItems?part=contentDetails&maxResults=50&playlistId={Uri.EscapeDataString(listId)}{token}", key, cancellationToken);
            ids.AddRange(items.RootElement.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("contentDetails").GetProperty("videoId").GetString()!));
            page = items.RootElement.TryGetProperty("nextPageToken", out var next) ? next.GetString() : null;
        }
        while (page is not null && ids.Count < max);

        return await FetchVideosAsync(ids.Take(max).ToList(), key, cancellationToken);
    }

    #endregion

    #region Private Methods

    private async Task<string?> GetKeyAsync(CancellationToken cancellationToken)
    {
        var key = await _settingsRepository.GetSettingValueAsync(KeyCode, cancellationToken);

        return string.IsNullOrEmpty(key) ? null : key;
    }

    /// <summary>The key goes in a header, not the address, so it never shows up in request logs.</summary>
    private async Task<JsonDocument> GetAsync(string path, string key, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, BaseUrl + path);
        request.Headers.Add("x-goog-api-key", key);
        using var response = await _http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
    }

    private async Task<List<YoutubeVideoDto>> FetchVideosAsync(List<string> ids, string key, CancellationToken cancellationToken)
    {
        var found = new Dictionary<string, YoutubeVideoDto>();

        foreach (var chunk in ids.Chunk(50))
        {
            using var answer = await GetAsync($"videos?part=snippet,contentDetails&maxResults=50&id={string.Join(',', chunk)}", key, cancellationToken);

            foreach (var item in answer.RootElement.GetProperty("items").EnumerateArray())
            {
                var id = item.GetProperty("id").GetString()!;
                var snippet = item.GetProperty("snippet");
                var duration = XmlConvert.ToTimeSpan(item.GetProperty("contentDetails").GetProperty("duration").GetString() ?? "PT0S");

                found[id] = new YoutubeVideoDto { Id = id, Title = snippet.GetProperty("title").GetString() ?? string.Empty, Artist = snippet.GetProperty("channelTitle").GetString() ?? string.Empty, Duration = (int)duration.TotalSeconds, Thumb = $"https://i.ytimg.com/vi/{id}/mqdefault.jpg" };
            }
        }

        return ids.Where(found.ContainsKey).Select(id => found[id]).ToList();
    }

    #endregion
}
