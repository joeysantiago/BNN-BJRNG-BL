using Thakurg.Contracts.SpeedTest;

namespace Thakurg.Application.Services;

public interface ISpeedTestService
{
    Stream CreateDownload(long bytes);

    Task<long> ReceiveUploadAsync(Stream body, CancellationToken cancellationToken);

    Task<SpeedTestInfoDto> GetInfoAsync(string? remoteIp, CancellationToken cancellationToken);
}
