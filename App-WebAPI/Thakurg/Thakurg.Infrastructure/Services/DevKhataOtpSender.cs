using Microsoft.Extensions.Logging;
using Thakurg.Application.Services;
using Thakurg.Contracts.Khata;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// Local development sender (Khata:Otp:Sender = "Dev"): nothing is emailed or texted, the code is written to the API console.
public class DevKhataOtpSender : IKhataOtpSender
{
    private readonly ILogger<DevKhataOtpSender> _logger;

    public DevKhataOtpSender(ILogger<DevKhataOtpSender> logger)
    {
        _logger = logger;
    }

    #region Public Methods

    public Task SendAsync(KhataOtpChannel channel, string identifier, string code, CancellationToken cancellationToken)
    {
        _logger.LogWarning("SnapKhata {Channel} code for {Identifier}: {Code} (development sender, nothing was sent)", channel, KhataMask.Identifier(identifier), code);

        return Task.CompletedTask;
    }

    #endregion
}
