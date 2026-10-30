using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

public interface IKhataOtpSender
{
    Task SendAsync(KhataOtpChannel channel, string identifier, string code, CancellationToken cancellationToken);
}
