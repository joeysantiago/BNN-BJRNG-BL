using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

public interface IKhataManifestService
{
    Task<KhataManifestDto> BuildAsync(string? language, CancellationToken cancellationToken);
}
