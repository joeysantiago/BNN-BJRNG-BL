using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

// The App Lock of My Tasks. Independent from SnapKhata: its own PIN, its own lock sessions.
public interface ITaskPinService
{
    Task EnsureUnlockedAsync(TaskCallerDto caller, CancellationToken cancellationToken);

    Task<TaskPinStatusDto> LockAsync(TaskCallerDto caller, CancellationToken cancellationToken);

    Task<TaskPinStatusDto> GetStatusAsync(TaskCallerDto caller, CancellationToken cancellationToken);

    Task<TaskPinStatusDto> VerifyAsync(TaskCallerDto caller, TaskPinRequestDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskPinStatusDto>> SetAsync(TaskCallerDto caller, TaskPinRequestDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskPinStatusDto>> RemoveAsync(TaskCallerDto caller, TaskPinRequestDto request, CancellationToken cancellationToken);
}
