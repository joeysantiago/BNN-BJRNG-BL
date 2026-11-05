using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface ITaskService
{
    Task<List<TaskDto>> GetAllAsync(TaskCallerDto caller, CancellationToken cancellationToken);

    Task<List<TaskDto>> GetDeletedAsync(TaskCallerDto caller, CancellationToken cancellationToken);

    Task<List<TaskHistoryDto>> GetHistoryAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskChangesDto>> DeleteAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskChangesDto>> ReopenAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskChangesDto>> RestoreAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskChangesDto>> CompleteAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskChangesDto>> DuplicateAsync(TaskCallerDto caller, int taskId, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskChangesDto>> CreateAsync(TaskCallerDto caller, TaskRequestDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskChangesDto>> BulkAsync(TaskCallerDto caller, TaskBulkRequestDto request, CancellationToken cancellationToken);

    Task<TaskChangesDto> ToggleChecklistAsync(TaskCallerDto caller, int taskId, int itemId, bool isDone, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskChangesDto>> UpdateAsync(TaskCallerDto caller, int taskId, TaskRequestDto request, CancellationToken cancellationToken);
}
