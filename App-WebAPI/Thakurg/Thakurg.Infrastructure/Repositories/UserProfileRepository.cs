using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class UserProfileRepository : IUserProfileRepository
{
    private readonly ICommonDbContext _dbContext;

    public UserProfileRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddAsync(UserProfile profile, CancellationToken cancellationToken)
    {
        _dbContext.UserProfiles.Add(profile);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<UserProfile?> GetByUserAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.UserProfiles.WhereActive().FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);
    }

    // Every row counts, deleted ones too, as the unique index on Mobile does.
    public Task<bool> IsMobileTakenAsync(string mobile, int exceptUserId, CancellationToken cancellationToken)
    {
        return _dbContext.UserProfiles.AsNoTracking().AnyAsync(p => p.Mobile == mobile && p.UserId != exceptUserId, cancellationToken);
    }

    #endregion
}
