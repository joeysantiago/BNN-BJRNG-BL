using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class KhataNotificationRepository : IKhataNotificationRepository
{
    private readonly ICommonDbContext _dbContext;

    public KhataNotificationRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task<KhataUser?> GetOwnerAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataUsers.AsNoTracking().WhereActive().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    public Task<KhataContact?> GetContactAsync(int contactId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataContacts.AsNoTracking().WhereActive().FirstOrDefaultAsync(c => c.Id == contactId, cancellationToken);
    }

    // The company name on the owner's account profile (UserProfiles), if any.
    public Task<string?> GetCompanyNameAsync(int accountUserId, CancellationToken cancellationToken)
    {
        return _dbContext.UserProfiles.AsNoTracking().WhereActive().Where(p => p.UserId == accountUserId).Select(p => p.CompanyName).FirstOrDefaultAsync(cancellationToken);
    }

    public Task<KhataCurrency?> GetBookCurrencyAsync(int bookId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataBooks.AsNoTracking().Where(b => b.Id == bookId).Join(_dbContext.KhataCurrencies, b => b.CurrencyId, c => c.Id, (_, c) => c).FirstOrDefaultAsync(cancellationToken);
    }

    public Task<KhataNotificationPref?> GetPrefAsync(int contactId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataNotificationPrefs.AsNoTracking().WhereActive().FirstOrDefaultAsync(p => p.ContactId == contactId, cancellationToken);
    }

    // Soft-deleted entries too: a deletion is told to the party as well.
    public Task<KhataTransaction?> GetTransactionAsync(int transactionId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataTransactions.AsNoTracking().FirstOrDefaultAsync(t => t.Id == transactionId && t.IsActive && !t.IsDeleted, cancellationToken);
    }

    public async Task AddLogsAsync(IEnumerable<KhataNotificationLog> logs, CancellationToken cancellationToken)
    {
        _dbContext.KhataNotificationLogs.AddRange(logs);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    #endregion
}
