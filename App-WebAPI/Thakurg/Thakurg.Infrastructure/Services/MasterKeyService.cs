using System.Text.RegularExpressions;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;

namespace Thakurg.Infrastructure.Services;

public class MasterKeyService : IMasterKeyService
{
    private readonly IMessageService _messageService;

    private readonly IPasswordHasher _passwordHasher;

    private const string HashCode = "Security.MasterKeyHash";

    private readonly ISettingsRepository _settingsRepository;

    private static readonly Regex PasswordPattern = new(@"^[\x21-\x7E]{6,64}$", RegexOptions.Compiled);

    public MasterKeyService(IMessageService messageService, IPasswordHasher passwordHasher, ISettingsRepository settingsRepository)
    {
        _messageService = messageService;
        _passwordHasher = passwordHasher;
        _settingsRepository = settingsRepository;
    }

    #region Public Methods

    public async Task<bool> IsSetAsync(CancellationToken cancellationToken)
    {
        return !string.IsNullOrEmpty(await _settingsRepository.GetSettingValueAsync(HashCode, cancellationToken));
    }

    public async Task VerifyAsync(string? masterKey, CancellationToken cancellationToken)
    {
        var stored = await _settingsRepository.GetSettingValueAsync(HashCode, cancellationToken);

        if (string.IsNullOrEmpty(stored) || !_passwordHasher.Verify(masterKey ?? string.Empty, stored))
            throw new BusinessException(MessageCodes.MasterKeyInvalid, 401);
    }

    /// <summary>Saves the first master key. Refused once a key exists, so it cannot be replaced from the web.</summary>
    public async Task<string> CreateAsync(string? password, string? confirm, CancellationToken cancellationToken)
    {
        if (await IsSetAsync(cancellationToken))
            throw new BusinessException(MessageCodes.MasterKeyAlreadySet, 409);

        if (password is null || !PasswordPattern.IsMatch(password))
            throw new BusinessException(MessageCodes.MusicPasswordWeak, 400);

        if (password != confirm)
            throw new BusinessException(MessageCodes.MasterKeyMismatch, 400);

        await _settingsRepository.UpdateAsync([], [], [], new Dictionary<string, string> { [HashCode] = _passwordHasher.Hash(password) }, cancellationToken);

        return await _messageService.GetAsync(MessageCodes.MasterKeyCreated);
    }

    #endregion
}
