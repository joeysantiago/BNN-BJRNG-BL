using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface ITaskSettingsService
{
    Task<TaskSettingsDto> GetAsync(TaskCallerDto caller, CancellationToken cancellationToken);

    Task<string> TestWhatsAppAsync(TaskCallerDto caller, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskSettingsDto>> SaveAsync(TaskCallerDto caller, TaskSettingsRequestDto request, CancellationToken cancellationToken);

}
