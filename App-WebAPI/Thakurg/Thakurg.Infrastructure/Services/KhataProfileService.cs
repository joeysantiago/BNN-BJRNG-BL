using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

// SnapKhata keeps its own profile (KhataUsers) next to the common login. The first Khata request of a user creates it, with the Khata:NewUser values.
public class KhataProfileService : IKhataProfileService
{
    private readonly KhataOptions _options;

    private readonly IAuthRepository _authRepository;

    private readonly IKhataUserRepository _userRepository;

    public KhataProfileService(IOptions<KhataOptions> options, IAuthRepository authRepository, IKhataUserRepository userRepository)
    {
        _options = options.Value;
        _authRepository = authRepository;
        _userRepository = userRepository;
    }

    #region Public Methods

    public async Task<int> ResolveAsync(int accountUserId, CancellationToken cancellationToken)
    {
        var profile = await _userRepository.FindByAccountAsync(accountUserId, cancellationToken);

        if (profile is not null)
            return profile.Id;

        var account = await _authRepository.GetUserAsync(accountUserId, cancellationToken);
        profile = new KhataUser { UserId = accountUserId, DisplayName = account?.DisplayName ?? string.Empty, Language = _options.NewUser.Language, TimeZone = _options.NewUser.TimeZone, DailySummaryTime = _options.NewUser.DailySummaryTime, NotificationsEnabled = _options.NewUser.NotificationsEnabled, CreatedBy = accountUserId };
        if (await _userRepository.TryAddUserAsync(profile, cancellationToken))
            return profile.Id;

        // A parallel request created the profile first; use that one.
        profile = await _userRepository.FindByAccountAsync(accountUserId, cancellationToken);

        return profile!.Id;
    }

    #endregion
}
