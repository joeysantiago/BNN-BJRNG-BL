using Thakurg.Contracts.Apps;

namespace Thakurg.Application.Services;

public interface IAppManifestService
{
    Task<AppManifestDto?> BuildAsync(string appCode, string? language, CancellationToken cancellationToken);
}
