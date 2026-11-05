using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IOtpRepository
{
    Task AddAsync(OneTimeCode code, CancellationToken cancellationToken);

    Task InvalidateAsync(int codeId, DateTime now, CancellationToken cancellationToken);

    Task AddAttemptAsync(int codeId, DateTime now, CancellationToken cancellationToken);

    Task<bool> TryConsumeAsync(int codeId, DateTime now, CancellationToken cancellationToken);

    Task<List<DateTime>> GetSentOnAsync(string destination, DateTime since, CancellationToken cancellationToken);

    Task<OneTimeCode?> GetLatestAsync(string destination, string channel, string appCode, CancellationToken cancellationToken);

    Task<List<DateTime>> GetFailedOnAsync(string destination, DateTime since, int maxAttempts, CancellationToken cancellationToken);
}
