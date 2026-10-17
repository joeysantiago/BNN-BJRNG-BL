using System.Net;
using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.SpeedTest;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

public class SpeedTestService : ISpeedTestService
{
    private readonly SpeedTestOptions _options;

    private readonly ISettingsRepository _settingsRepository;

    public SpeedTestService(IOptions<SpeedTestOptions> options, ISettingsRepository settingsRepository)
    {
        _options = options.Value;
        _settingsRepository = settingsRepository;
    }

    #region Public Methods

    public Stream CreateDownload(long bytes)
    {
        if (bytes < 0 || bytes > _options.MaxDownloadBytes)
            throw new BusinessException(MessageCodes.SpeedTestSizeInvalid, 400, _options.MaxDownloadBytes);

        return new RandomDataStream(bytes);
    }

    public async Task<long> ReceiveUploadAsync(Stream body, CancellationToken cancellationToken)
    {
        var buffer = new byte[81920];
        long total = 0;
        int read;

        while ((read = await body.ReadAsync(buffer, cancellationToken)) > 0)
            total += read;

        return total;
    }

    public async Task<SpeedTestInfoDto> GetInfoAsync(string? remoteIp, string? forwardedFor, CancellationToken cancellationToken)
    {
        var serverName = await _settingsRepository.GetSettingValueAsync("SpeedTest.ServerName", cancellationToken);

        return new SpeedTestInfoDto { Ip = ResolveIp(remoteIp, forwardedFor), ServerName = serverName ?? string.Empty };
    }

    #endregion

    #region Private Methods

    private static string ResolveIp(string? remoteIp, string? forwardedFor)
    {
        var candidate = forwardedFor?.Split(',')[0].Trim();
        var text = string.IsNullOrEmpty(candidate) ? remoteIp : candidate;

        if (!IPAddress.TryParse(text, out var address))
            return string.Empty;

        return address.IsIPv4MappedToIPv6 ? address.MapToIPv4().ToString() : address.ToString();
    }

    #endregion
}
