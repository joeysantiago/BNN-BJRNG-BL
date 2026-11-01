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

    public async Task AddUserAsync(KhataUser user, CancellationToken cancellationToken)
    {
        _dbContext.KhataUsers.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);
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

    public Task<KhataUser?> FindByAccountAsync(int accountUserId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataUsers.WhereActive().FirstOrDefaultAsync(u => u.UserId == accountUserId, cancellationToken);
    }

    #endregion
}
