using Thakurg.Contracts.Tasks;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface ITaskReminderRepository
{
    Task AddLogAsync(TaskReminderLog log, CancellationToken cancellationToken);

    Task<Dictionary<string, string>> GetAppNamesAsync(string appCode, CancellationToken cancellationToken);

    Task<List<TaskReminderRecipientDto>> GetRecipientsAsync(string appCode, CancellationToken cancellationToken);

    Task<HashSet<string>> GetSentAsync(IReadOnlyCollection<int> taskIds, DateOnly forDate, CancellationToken cancellationToken);
}
