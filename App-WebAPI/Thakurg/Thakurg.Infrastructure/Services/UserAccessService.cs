using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Infrastructure.Services;

// The Users and access panel of the master page (administrators only): which apps each user may open, and who is an administrator.
public class UserAccessService : IUserAccessService
{
    private readonly IMessageService _messageService;

    private readonly IUserAccessRepository _accessRepository;

    public UserAccessService(IMessageService messageService, IUserAccessRepository accessRepository)
    {
        _messageService = messageService;
        _accessRepository = accessRepository;
    }

    #region Public Methods

    public async Task<UserAccessDto> GetAsync(CancellationToken cancellationToken)
    {
        var apps = await _accessRepository.GetAppsAsync(cancellationToken);
        var users = await _accessRepository.GetUsersAsync(cancellationToken);
        var access = await _accessRepository.GetAccessAsync(cancellationToken);
        var codes = apps.ToDictionary(a => a.Id, a => a.Code);

        return new UserAccessDto
        {
            Apps = apps.Select(a => new AppDto { Code = a.Code, AutoGrant = a.AutoGrant }).ToList(),
            Users = users.Select(u => new UserDto { Id = u.Id, Email = u.Email, DisplayName = u.DisplayName, Language = u.Language, IsAdmin = u.IsAdmin, Apps = access.Where(a => a.UserId == u.Id && codes.ContainsKey(a.AppId)).Select(a => codes[a.AppId]).ToList() }).ToList()
        };
    }

    // An administrator cannot take away the last administrator, so the master page always has someone who can manage access.
    public async Task<ServiceResultDto<UserDto>> UpdateAsync(int adminUserId, int userId, UserAccessUpdateDto request, CancellationToken cancellationToken)
    {
        var user = await _accessRepository.GetUserAsync(userId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthUserNotFound, 404);
        var apps = await _accessRepository.GetAppsAsync(cancellationToken);
        var codes = (request.Apps ?? []).Distinct().ToList();
        var unknown = codes.FirstOrDefault(c => apps.All(a => a.Code != c));

        if (unknown is not null)
            throw new BusinessException(MessageCodes.AuthAppUnknown, 400, unknown);

        if (user.IsAdmin && !request.IsAdmin && await _accessRepository.CountAdminsAsync(cancellationToken) <= 1)
            throw new BusinessException(MessageCodes.AuthLastAdmin, 409);

        user.IsAdmin = request.IsAdmin;
        user.ModifiedBy = adminUserId;
        user.ModifiedOn = DateTime.UtcNow;
        await _accessRepository.ReplaceAccessAsync(user.Id, apps.Where(a => codes.Contains(a.Code)).Select(a => a.Id).ToList(), cancellationToken);
        await _accessRepository.SaveChangesAsync(cancellationToken);
        var dto = new UserDto { Id = user.Id, Email = user.Email, DisplayName = user.DisplayName, Language = user.Language, IsAdmin = user.IsAdmin, Apps = apps.Where(a => codes.Contains(a.Code)).Select(a => a.Code).ToList() };

        return new ServiceResultDto<UserDto> { Data = dto, Message = await _messageService.GetAsync(MessageCodes.AuthAccessSaved) };
    }

    #endregion
}
