using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class KhataUserRepository : IKhataUserRepository
{
    private readonly ICommonDbContext _dbContext;

    public KhataUserRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<KhataUser?> GetUserAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataUsers.WhereActive().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    public async Task AddAuditAsync(KhataAuditLog entry, CancellationToken cancellationToken)
    {
        _dbContext.KhataAuditLogs.Add(entry);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    // The unique index on UserId decides which of two simultaneous first requests creates the profile; the loser gets false.
    public async Task<bool> TryAddUserAsync(KhataUser user, CancellationToken cancellationToken)
    {
        _dbContext.KhataUsers.Add(user);
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateException)
        {
            _dbContext.Entry(user).State = EntityState.Detached;
            return false;
        }
    }

    public Task<KhataUser?> FindByAccountAsync(int accountUserId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataUsers.WhereActive().FirstOrDefaultAsync(u => u.UserId == accountUserId, cancellationToken);
    }

    #endregion
}
