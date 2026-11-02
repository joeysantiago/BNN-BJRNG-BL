using Thakurg.Contracts.Auth;

namespace Thakurg.Application.Services;

public interface IAuthSessionCache
{
    void Forget(int userId);

    Task<AuthAccessDto?> GetAsync(int sessionId, int userId, CancellationToken cancellationToken);
}
