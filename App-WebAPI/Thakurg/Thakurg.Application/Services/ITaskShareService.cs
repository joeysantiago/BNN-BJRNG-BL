using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface ITaskShareService
{
    Task<List<TaskSharedDto>> GetIncomingAsync(TaskCallerDto caller, CancellationToken cancellationToken);

    Task<List<TaskShareDto>> GetSharesAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken);

    Task<ServiceResultDto<int>> RemoveAsync(TaskCallerDto caller, int shareId, CancellationToken cancellationToken);

    Task<ServiceResultDto<int>> DeclineAsync(TaskCallerDto caller, int shareId, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskSharedDto>> AcceptAsync(TaskCallerDto caller, int shareId, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskShareDto>> ShareAsync(TaskCallerDto caller, int taskId, TaskShareRequestDto request, CancellationToken cancellationToken);
}
