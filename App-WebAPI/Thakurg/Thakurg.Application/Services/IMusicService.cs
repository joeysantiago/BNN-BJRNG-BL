using Thakurg.Contracts.Abstractions;
using Thakurg.Contracts.Music;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IMusicService
{
    Task<MusicTracksDto> ListAsync(string player, CancellationToken cancellationToken);

    Task<FileStreamDto> OpenCoverAsync(string player, int trackId, CancellationToken cancellationToken);

    Task<string> DeleteAsync(string player, int trackId, string? password, CancellationToken cancellationToken);

    Task<FileStreamDto> OpenAudioAsync(string player, int trackId, string? range, CancellationToken cancellationToken);

    Task<ServiceResultDto<MusicTracksDto>> UploadAsync(string player, string? password, List<UploadedFileDto> files, CancellationToken cancellationToken);
}
