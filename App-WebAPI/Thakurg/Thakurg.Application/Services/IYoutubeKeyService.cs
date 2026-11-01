using Thakurg.Contracts.YouTube;

namespace Thakurg.Application.Services;

public interface IYoutubeKeyService
{
    Task<string> SaveAsync(string? apiKey, CancellationToken cancellationToken);

    Task<YoutubeKeyStatusDto> GetStatusAsync(CancellationToken cancellationToken);
}
