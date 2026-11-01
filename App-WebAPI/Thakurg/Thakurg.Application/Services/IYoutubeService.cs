using Thakurg.Contracts.Abstractions;
using Thakurg.Contracts.YouTube;

namespace Thakurg.Application.Services;

public interface IYoutubeService
{
    YoutubeDownloadInfoDto GetDownloadInfo();

    Task<FileStreamDto> OpenDownloadAsync(string videoId, CancellationToken cancellationToken);

    Task<YoutubeVideoDto> GetVideoAsync(string videoId, CancellationToken cancellationToken);

    Task<List<YoutubeVideoDto>> SearchAsync(string? query, CancellationToken cancellationToken);

    Task<List<YoutubeVideoDto>> GetPlaylistAsync(string listId, CancellationToken cancellationToken);

    Task<FileStreamDto> OpenAudioAsync(string videoId, string? range, CancellationToken cancellationToken);
}
