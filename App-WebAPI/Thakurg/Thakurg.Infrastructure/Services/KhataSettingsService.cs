using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// The user's own SnapKhata settings (KhataUsers): whether their parties get messages about entries; plus, read only, where new bill photos are kept.
public class KhataSettingsService : IKhataSettingsService
{
    private readonly IMessageService _messageService;

    private readonly IKhataUserRepository _userRepository;

    private readonly IKhataStorageRepository _storageRepository;

    public KhataSettingsService(IMessageService messageService, IKhataUserRepository userRepository, IKhataStorageRepository storageRepository)
    {
        _messageService = messageService;
        _userRepository = userRepository;
        _storageRepository = storageRepository;
    }

    #region Public Methods

    public async Task<KhataSettingsDto> GetAsync(KhataCallerDto caller, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(caller, cancellationToken);

        return await ToDtoAsync(user, cancellationToken);
    }

    public async Task<ServiceResultDto<KhataSettingsDto>> SaveAsync(KhataCallerDto caller, KhataSettingsRequestDto request, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(caller, cancellationToken);

        if (user.NotificationsEnabled != request.NotificationsEnabled)
        {
            user.NotificationsEnabled = request.NotificationsEnabled;
            user.ModifiedOn = DateTime.UtcNow;
            await _userRepository.SaveChangesAsync(cancellationToken);
        }

        return new ServiceResultDto<KhataSettingsDto> { Data = await ToDtoAsync(user, cancellationToken), Message = await _messageService.GetAsync(MessageCodes.KhataSettingsSaved) };
    }

    #endregion

    #region Private Methods

    private async Task<KhataSettingsDto> ToDtoAsync(KhataUser user, CancellationToken cancellationToken)
    {
        var storage = await _storageRepository.GetAsync(cancellationToken);
        var provider = KhataStorageRules.IsAzureActive(storage) ? KhataStorageProviders.Azure : KhataStorageProviders.Local;

        return new KhataSettingsDto { NotificationsEnabled = user.NotificationsEnabled, Storage = new KhataStorageInfoDto { Provider = provider } };
    }

    private async Task<KhataUser> RequireUserAsync(KhataCallerDto caller, CancellationToken cancellationToken)
    {
        return await _userRepository.GetUserAsync(caller.UserId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);
    }

    #endregion
}
