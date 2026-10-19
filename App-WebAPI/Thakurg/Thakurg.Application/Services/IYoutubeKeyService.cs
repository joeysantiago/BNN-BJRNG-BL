using Thakurg.Contracts.YouTube;

namespace Thakurg.Application.Services;

public interface IYoutubeKeyService
{
    Task<YoutubeKeyStatusDto> GetStatusAsync(CancellationToken cancellationToken);

    Task<string> SaveAsync(string? apiKey, string? masterKey, CancellationToken cancellationToken);
}
