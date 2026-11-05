using Thakurg.Contracts.Tasks;

namespace Thakurg.Application.Services;

public interface ITaskProfileService
{
    Task<int> ResolveAsync(int accountUserId, CancellationToken cancellationToken);

    Task<string> DeleteAsync(TaskCallerDto caller, CancellationToken cancellationToken);
}
