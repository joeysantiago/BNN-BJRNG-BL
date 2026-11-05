using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface ITaskCategoryService
{
    Task<List<TaskCategoryDto>> GetAsync(TaskCallerDto caller, CancellationToken cancellationToken);

    Task<ServiceResultDto<int>> DeleteAsync(TaskCallerDto caller, int categoryId, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskCategoryDto>> CreateAsync(TaskCallerDto caller, TaskCategoryRequestDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskCategoryDto>> UpdateAsync(TaskCallerDto caller, int categoryId, TaskCategoryRequestDto request, CancellationToken cancellationToken);
}
