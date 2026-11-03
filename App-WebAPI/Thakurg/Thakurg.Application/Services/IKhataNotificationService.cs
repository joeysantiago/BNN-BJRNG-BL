using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

public interface IKhataNotificationService
{
    Task SendAsync(KhataNotificationJobDto job, CancellationToken cancellationToken);
}
