using System.Text.RegularExpressions;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

public class MusicAccessService : IMusicAccessService
{
    private readonly IMessageService _messageService;

    private readonly IPasswordHasher _passwordHasher;

    private readonly IMusicRepository _musicRepository;

    private readonly IMasterKeyService _masterKeyService;

    private static readonly Regex PasswordPattern = new(@"^[\x21-\x7E]{6,64}$", RegexOptions.Compiled);

    public MusicAccessService(IPasswordHasher passwordHasher, IMessageService messageService, IMusicRepository musicRepository, IMasterKeyService masterKeyService)
    {
        _passwordHasher = passwordHasher;
        _messageService = messageService;
        _musicRepository = musicRepository;
        _masterKeyService = masterKeyService;
    }

    #region Public Methods

    public void VerifyEditPassword(MusicPlayer player, string? password)
    {
        if (!_passwordHasher.Verify(password ?? string.Empty, player.PasswordHash))
            throw new BusinessException(MessageCodes.MusicPasswordInvalid, 401);
    }

    public async Task<string> ResetPasswordAsync(string player, string? masterKey, string? newPassword, CancellationToken cancellationToken)
    {
        var musicPlayer = await RequirePlayerAsync(player, cancellationToken);
        await _masterKeyService.VerifyAsync(masterKey, cancellationToken);
        await _musicRepository.UpdatePasswordAsync(musicPlayer.Id, _passwordHasher.Hash(RequireStrong(newPassword)), cancellationToken);

        return await _messageService.GetAsync(MessageCodes.MusicPasswordReset);
    }

    public async Task<string> ChangePasswordAsync(string player, string? currentPassword, string? newPassword, CancellationToken cancellationToken)
    {
        var musicPlayer = await RequirePlayerAsync(player, cancellationToken);
        VerifyEditPassword(musicPlayer, currentPassword);
        await _musicRepository.UpdatePasswordAsync(musicPlayer.Id, _passwordHasher.Hash(RequireStrong(newPassword)), cancellationToken);

        return await _messageService.GetAsync(MessageCodes.MusicPasswordChanged);
    }

    #endregion

    #region Private Methods

    private static string RequireStrong(string? password)
    {
        if (password is null || !PasswordPattern.IsMatch(password))
            throw new BusinessException(MessageCodes.MusicPasswordWeak, 400);

        return password;
    }

    private async Task<MusicPlayer> RequirePlayerAsync(string code, CancellationToken cancellationToken)
    {
        return await _musicRepository.GetPlayerAsync(code.ToLowerInvariant(), cancellationToken) ?? throw new BusinessException(MessageCodes.MusicPlayerNotFound, 404);
    }

    #endregion
}
