using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IUserProfileRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task AddAsync(UserProfile profile, CancellationToken cancellationToken);

    Task<UserProfile?> GetByUserAsync(int userId, CancellationToken cancellationToken);

    Task<bool> IsMobileTakenAsync(string mobile, int exceptUserId, CancellationToken cancellationToken);
}
