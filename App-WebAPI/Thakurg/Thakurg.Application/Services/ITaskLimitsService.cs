using Thakurg.Contracts.Tasks;

namespace Thakurg.Application.Services;

public interface ITaskLimitsService
{
    Task<TaskLimitsDto> GetAsync(CancellationToken cancellationToken);
}
