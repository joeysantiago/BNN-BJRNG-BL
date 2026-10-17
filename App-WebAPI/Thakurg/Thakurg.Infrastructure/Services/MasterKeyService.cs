using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;

namespace Thakurg.Infrastructure.Services;

public class MasterKeyService : IMasterKeyService
{
    private readonly IPasswordHasher _passwordHasher;

    private readonly ISettingsRepository _settingsRepository;

    public MasterKeyService(IPasswordHasher passwordHasher, ISettingsRepository settingsRepository)
    {
        _passwordHasher = passwordHasher;
        _settingsRepository = settingsRepository;
    }

    #region Public Methods

    public async Task VerifyAsync(string? masterKey, CancellationToken cancellationToken)
    {
        var stored = await _settingsRepository.GetSettingValueAsync("Security.MasterKeyHash", cancellationToken);

        if (string.IsNullOrEmpty(stored) || !_passwordHasher.Verify(masterKey ?? string.Empty, stored))
            throw new BusinessException(MessageCodes.MasterKeyInvalid, 401);
    }

    #endregion
}
