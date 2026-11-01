using Thakurg.Contracts.YouTube;

namespace Thakurg.Application.Services;

/// <summary>The official YouTube Data API. Every lookup returns null when no API key is stored, so callers can use another source.</summary>
public interface IYoutubeDataApi
{
    Task<bool> IsConfiguredAsync(CancellationToken cancellationToken);

    Task<bool> IsValidKeyAsync(string key, CancellationToken cancellationToken);

    Task<YoutubeVideoDto?> GetVideoAsync(string videoId, CancellationToken cancellationToken);

    Task<List<YoutubeVideoDto>?> SearchAsync(string text, int max, CancellationToken cancellationToken);

    Task<List<YoutubeVideoDto>?> GetPlaylistAsync(string listId, int max, CancellationToken cancellationToken);
}
