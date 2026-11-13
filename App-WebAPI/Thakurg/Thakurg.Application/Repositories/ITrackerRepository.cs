using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

// SnapTracker's rows of one user: the profile, the transactions with their SMS texts, the alerts and the category rules. Every query is limited to the user.
public interface ITrackerRepository
{
    void AddAlert(TrackerAlert alert);

    void AddAccount(TrackerAccount account);

    void AddRule(TrackerCategoryRule rule);

    void AddTransaction(TrackerTransaction transaction);

    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task DeleteAllAsync(int userId, CancellationToken cancellationToken);

    Task DeleteSmsTextsAsync(int userId, CancellationToken cancellationToken);

    Task<TrackerUser?> GetUserAsync(int userId, CancellationToken cancellationToken);

    Task<bool> TryAddUserAsync(TrackerUser user, CancellationToken cancellationToken);

    Task TrimAlertsAsync(int userId, int keep, CancellationToken cancellationToken);

    Task<List<TrackerAccount>> GetAccountsAsync(int userId, CancellationToken cancellationToken);

    Task<List<TrackerAlert>> GetAlertsAsync(int userId, CancellationToken cancellationToken);

    Task<TrackerUser?> FindUserByAccountAsync(int accountUserId, CancellationToken cancellationToken);

    Task<List<TrackerCategoryRule>> GetRulesAsync(int userId, CancellationToken cancellationToken);

    Task RemoveTransactionAsync(TrackerTransaction transaction, CancellationToken cancellationToken);

    Task<List<TrackerTransaction>> GetTransactionsAsync(int userId, CancellationToken cancellationToken);

    Task<TrackerTransaction?> GetTransactionAsync(int userId, int id, CancellationToken cancellationToken);

    Task<bool> HasSmsAsync(int userId, string bodyHash, DateTime receivedOn, CancellationToken cancellationToken);

    Task<List<TrackerTransaction>> GetDuplicateCandidatesAsync(int userId, string? reference, string bodyHash, long amountMinor, DateTime from, DateTime to, CancellationToken cancellationToken);
}
