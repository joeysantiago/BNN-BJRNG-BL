using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Configurations;

namespace Thakurg.Infrastructure.Services;

// Every request checks that its session is still active and loads the user's role, its rights and apps. Audio and video arrive in many small packets,
// so the answer is kept in memory for Auth:SessionCacheSeconds and the database can sleep while music plays.
// A logout, a password change or an access change on the master page calls Forget, so it still applies at once.
public class AuthSessionCache : IAuthSessionCache
{
    private readonly IMemoryCache _cache;

    private readonly AuthOptions _options;

    private readonly IAuthRepository _authRepository;

    public AuthSessionCache(IMemoryCache cache, IOptions<AuthOptions> options, IAuthRepository authRepository)
    {
        _cache = cache;
        _options = options.Value;
        _authRepository = authRepository;
    }

    #region Public Methods

    public void Forget(int userId)
    {
        if (!_cache.TryGetValue(UserKey(userId), out CancellationTokenSource? source) || source is null)
            return;

        _cache.Remove(UserKey(userId));
        source.Cancel();
    }

    // The user's token is taken before the database is read, so a Forget during the read also drops the entry saved after it.
    public async Task<AuthAccessDto?> GetAsync(int sessionId, int userId, CancellationToken cancellationToken)
    {
        var key = $"auth-session:{userId}:{sessionId}";

        if (_cache.TryGetValue(key, out AuthAccessDto? cached) && cached is not null)
            return cached;

        var forgotten = UserSource(userId).Token;

        if (!await _authRepository.IsSessionActiveAsync(sessionId, userId, DateTime.UtcNow, cancellationToken))
            return null;

        var user = await _authRepository.GetUserAsync(userId, cancellationToken);

        if (user is null)
            return null;

        var role = await _authRepository.GetRoleAsync(user.RoleId, cancellationToken);

        if (role is null)
            return null;

        var rights = await _authRepository.GetPermissionsAsync(role.Id, cancellationToken);
        var access = new AuthAccessDto { RoleCode = role.Code, IsAdmin = RoleCodes.IsAdmin(role.Code), Permissions = rights.SelectMany(PermissionNames.Expand).ToList(), Apps = await _authRepository.GetAppCodesAsync(userId, cancellationToken) };
        _cache.Set(key, access, new MemoryCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromSeconds(_options.SessionCacheSeconds)).AddExpirationToken(new CancellationChangeToken(forgotten)));

        return access;
    }

    #endregion

    #region Private Methods

    private static string UserKey(int userId)
    {
        return $"auth-user:{userId}";
    }

    private CancellationTokenSource UserSource(int userId)
    {
        return _cache.GetOrCreate(UserKey(userId), _ => new CancellationTokenSource())!;
    }

    #endregion
}
