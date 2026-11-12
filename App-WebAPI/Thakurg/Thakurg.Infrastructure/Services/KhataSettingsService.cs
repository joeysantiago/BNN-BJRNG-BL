using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

// The user's own SnapKhata settings (KhataUsers): whether their parties get messages about entries. Where photos are kept is the site's file storage (Settings > Keys).
public class KhataSettingsService : IKhataSettingsService
{
    private readonly IMessageService _messageService;

    private readonly IKhataUserRepository _userRepository;

    public KhataSettingsService(IMessageService messageService, IKhataUserRepository userRepository)
    {
        _messageService = messageService;
        _userRepository = userRepository;
    }

    #region Public Methods

    public async Task<KhataSettingsDto> GetAsync(KhataCallerDto caller, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(caller, cancellationToken);

        return ToDto(user);
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

        return new ServiceResultDto<KhataSettingsDto> { Data = ToDto(user), Message = await _messageService.GetAsync(MessageCodes.KhataSettingsSaved) };
    }

    #endregion

    #region Private Methods

    private static KhataSettingsDto ToDto(KhataUser user)
    {
        return new KhataSettingsDto { NotificationsEnabled = user.NotificationsEnabled };
    }

    private async Task<KhataUser> RequireUserAsync(KhataCallerDto caller, CancellationToken cancellationToken)
    {
        return await _userRepository.GetUserAsync(caller.UserId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);
    }

    #endregion
}
