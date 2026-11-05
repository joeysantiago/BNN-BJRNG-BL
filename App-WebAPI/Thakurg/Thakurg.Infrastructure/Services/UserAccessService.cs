using Microsoft.Extensions.Options;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Roles;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// The Users tab of the Settings page: add, change and delete users, their role (dropdown) and the apps each may open.
// Only a super admin may add, change or delete a super admin or give the super admin role. Nobody changes their own role or deletes themselves here.
public class UserAccessService : IUserAccessService
{
    private readonly AuthOptions _options;

    private const int MaxPasswordLength = 128;

    private const int MaxDisplayNameLength = 100;

    private readonly IAuthSessionCache _sessionCache;

    private readonly IMessageService _messageService;

    private readonly IPasswordHasher _passwordHasher;

    private readonly IUserAccessRepository _accessRepository;

    private static readonly string[] Languages = ["en", "hi", "ar"];

    public UserAccessService(IMessageService messageService, IUserAccessRepository accessRepository, IAuthSessionCache sessionCache, IPasswordHasher passwordHasher, IOptions<AuthOptions> options)
    {
        _messageService = messageService;
        _accessRepository = accessRepository;
        _sessionCache = sessionCache;
        _passwordHasher = passwordHasher;
        _options = options.Value;
    }

    #region Public Methods

    // status (UserStatuses) picks which users come back: active, archived, deleted or all; none = active and archived.
    public async Task<UserAccessDto> GetAsync(string? status, CancellationToken cancellationToken)
    {
        var apps = await _accessRepository.GetAppsAsync(cancellationToken);
        var roles = await _accessRepository.GetRolesAsync(cancellationToken);
        var users = await _accessRepository.GetUsersAsync(status, cancellationToken);
        var access = await _accessRepository.GetAccessAsync(cancellationToken);
        var codes = apps.ToDictionary(a => a.Id, a => a.Code);

        return new UserAccessDto
        {
            Apps = apps.Select(a => new AppDto { Code = a.Code, AutoGrant = a.AutoGrant }).ToList(),
            Roles = roles.Select(r => new RoleDto { Id = r.Id, Code = r.Code, Name = r.Name, Description = r.Description, IsSystem = r.IsSystem, IsDefault = r.IsDefault, SortOrder = r.SortOrder, UserCount = users.Count(u => u.RoleId == r.Id) }).ToList(),
            Users = users.Select(u => ToDto(u, roles.FirstOrDefault(r => r.Id == u.RoleId), access.Where(a => a.UserId == u.Id && codes.ContainsKey(a.AppId)).Select(a => codes[a.AppId]).ToList())).ToList()
        };
    }

    public async Task<List<QuickLoginDto>> GetQuickLoginsAsync(CancellationToken cancellationToken)
    {
        return (await _accessRepository.GetQuickLoginUsersAsync(cancellationToken)).Select(u => new QuickLoginDto { Id = u.Id, Email = u.Email }).ToList();
    }

    public async Task<string> DeleteAsync(AuthCallerDto caller, int userId, CancellationToken cancellationToken)
    {
        var user = await _accessRepository.GetUserAsync(userId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthUserNotFound, 404);
        var role = await _accessRepository.GetRoleAsync(user.RoleId, cancellationToken);

        if (user.Id == caller.UserId)
            throw new BusinessException(MessageCodes.AuthOwnAccount, 409);

        await GuardSuperAdminAsync(caller, role, null, cancellationToken);
        var now = DateTime.UtcNow;
        user.IsSoftDeleted = true;
        user.ModifiedBy = caller.UserId;
        user.ModifiedOn = now;
        await _accessRepository.SaveChangesAsync(cancellationToken);
        await _accessRepository.RevokeSessionsAsync(user.Id, now, cancellationToken);
        _sessionCache.Forget(user.Id);

        return await _messageService.GetAsync(MessageCodes.AuthUserDeleted);
    }

    // Brings a deleted user back. Only IsSoftDeleted is cleared: a user who was archived before the delete stays archived until activated.
    // Only a super admin restores a super admin.
    public async Task<string> RestoreAsync(AuthCallerDto caller, int userId, CancellationToken cancellationToken)
    {
        var user = await _accessRepository.GetDeletedUserAsync(userId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthUserNotFound, 404);
        var role = await _accessRepository.GetRoleAsync(user.RoleId, cancellationToken);

        await GuardSuperAdminAsync(caller, null, role, cancellationToken);
        user.IsSoftDeleted = false;
        user.ModifiedBy = caller.UserId;
        user.ModifiedOn = DateTime.UtcNow;
        await _accessRepository.SaveChangesAsync(cancellationToken);
        _sessionCache.Forget(user.Id);

        return await _messageService.GetAsync(MessageCodes.AuthUserRestored);
    }

    // Settings > General > Quick logins: shows or hides an existing user on the login page. No password is stored for it.
    public async Task<string> SetQuickLoginAsync(QuickLoginRequestDto request, CancellationToken cancellationToken)
    {
        var email = EmailAddress.Normalize(request.Email) ?? throw new BusinessException(MessageCodes.AuthEmailInvalid, 400);
        var user = await _accessRepository.FindByEmailAsync(email, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthUserNotFound, 404);
        user.ShowOnLogin = request.ShowOnLogin;
        await _accessRepository.SaveChangesAsync(cancellationToken);

        return await _messageService.GetAsync(request.ShowOnLogin ? MessageCodes.AuthQuickLoginSaved : MessageCodes.AuthQuickLoginRemoved);
    }

    // Archives (active = false) or activates a user. An archived user cannot log in and is logged out everywhere at once; activating lets them log in again.
    // Nobody archives themselves, only a super admin archives or activates a super admin, and the last active super admin cannot be archived.
    public async Task<string> SetActiveAsync(AuthCallerDto caller, int userId, bool active, CancellationToken cancellationToken)
    {
        var user = await _accessRepository.GetUserAsync(userId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthUserNotFound, 404);
        var role = await _accessRepository.GetRoleAsync(user.RoleId, cancellationToken);
        var code = active ? MessageCodes.AuthUserActivated : MessageCodes.AuthUserArchived;

        if (user.Id == caller.UserId)
            throw new BusinessException(MessageCodes.AuthOwnAccount, 409);

        if (user.IsActive == active)
            return await _messageService.GetAsync(code);

        await GuardSuperAdminAsync(caller, active ? null : role, active ? role : null, cancellationToken);
        var now = DateTime.UtcNow;
        user.IsActive = active;
        user.ModifiedBy = caller.UserId;
        user.ModifiedOn = now;
        await _accessRepository.SaveChangesAsync(cancellationToken);

        if (!active)
            await _accessRepository.RevokeSessionsAsync(user.Id, now, cancellationToken);

        _sessionCache.Forget(user.Id);

        return await _messageService.GetAsync(code);
    }

    public async Task<ServiceResultDto<UserDto>> CreateAsync(AuthCallerDto caller, UserCreateDto request, CancellationToken cancellationToken)
    {
        var email = EmailAddress.Normalize(request.Email) ?? throw new BusinessException(MessageCodes.AuthEmailInvalid, 400);

        if (await _accessRepository.EmailExistsAsync(email, cancellationToken))
            throw new BusinessException(MessageCodes.AuthEmailTaken, 409);

        var displayName = string.IsNullOrWhiteSpace(request.DisplayName) ? email[..email.IndexOf('@')] : request.DisplayName.Trim();

        if (displayName.Length > MaxDisplayNameLength)
            throw new BusinessException(MessageCodes.AuthProfileInvalid, 400, MaxDisplayNameLength);

        if (request.Password is null || request.Password.Length < _options.PasswordMinLength || request.Password.Length > MaxPasswordLength)
            throw new BusinessException(MessageCodes.AuthPasswordWeak, 400, _options.PasswordMinLength);

        var role = await _accessRepository.GetRoleAsync(request.RoleId, cancellationToken) ?? throw new BusinessException(MessageCodes.RoleNotFound, 400);
        await GuardSuperAdminAsync(caller, null, role, cancellationToken);
        var apps = await RequireAppsAsync(request.Apps, cancellationToken);
        var user = new User { Email = email, PasswordHash = _passwordHasher.Hash(request.Password), DisplayName = displayName, Language = Languages[0], RoleId = role.Id, CreatedBy = caller.UserId };
        await _accessRepository.AddUserAsync(user, cancellationToken);
        await _accessRepository.ReplaceAccessAsync(user.Id, apps.Select(a => a.Id).ToList(), cancellationToken);
        await _accessRepository.SaveChangesAsync(cancellationToken);

        return new ServiceResultDto<UserDto> { Data = ToDto(user, role, apps.Select(a => a.Code).ToList()), Message = await _messageService.GetAsync(MessageCodes.AuthUserCreated) };
    }

    public async Task<ServiceResultDto<UserDto>> UpdateAsync(AuthCallerDto caller, int userId, UserAccessUpdateDto request, CancellationToken cancellationToken)
    {
        var user = await _accessRepository.GetUserAsync(userId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthUserNotFound, 404);
        var current = await _accessRepository.GetRoleAsync(user.RoleId, cancellationToken);
        var role = await _accessRepository.GetRoleAsync(request.RoleId, cancellationToken) ?? throw new BusinessException(MessageCodes.RoleNotFound, 400);
        var displayName = string.IsNullOrWhiteSpace(request.DisplayName) ? user.DisplayName : request.DisplayName.Trim();

        if (displayName.Length > MaxDisplayNameLength)
            throw new BusinessException(MessageCodes.AuthProfileInvalid, 400, MaxDisplayNameLength);

        if (user.Id == caller.UserId && role.Id != user.RoleId)
            throw new BusinessException(MessageCodes.AuthOwnAccount, 409);

        await GuardSuperAdminAsync(caller, current, role, cancellationToken);
        var apps = await RequireAppsAsync(request.Apps, cancellationToken);
        user.RoleId = role.Id;
        user.DisplayName = displayName;
        user.ModifiedBy = caller.UserId;
        user.ModifiedOn = DateTime.UtcNow;
        await _accessRepository.ReplaceAccessAsync(user.Id, apps.Select(a => a.Id).ToList(), cancellationToken);
        await _accessRepository.SaveChangesAsync(cancellationToken);
        _sessionCache.Forget(user.Id);

        return new ServiceResultDto<UserDto> { Data = ToDto(user, role, apps.Select(a => a.Code).ToList()), Message = await _messageService.GetAsync(MessageCodes.AuthAccessSaved) };
    }

    #endregion

    #region Private Methods

    private static UserDto ToDto(User user, Role? role, List<string> apps)
    {
        return new UserDto { Id = user.Id, Email = user.Email, DisplayName = user.DisplayName, Language = user.Language, Avatar = user.AvatarFile, IsArchived = !user.IsActive && !user.IsSoftDeleted, IsDeleted = user.IsSoftDeleted, CreatedOn = user.CreatedOn, LastLoginOn = user.LastLoginOn, RoleId = user.RoleId, RoleCode = role?.Code ?? string.Empty, RoleName = role?.Name ?? string.Empty, IsAdmin = RoleCodes.IsAdmin(role?.Code), Apps = apps };
    }

    // Every ticked app must exist; the answer keeps the order of the Apps table.
    private async Task<List<App>> RequireAppsAsync(List<string>? requested, CancellationToken cancellationToken)
    {
        var apps = await _accessRepository.GetAppsAsync(cancellationToken);
        var codes = (requested ?? []).Distinct().ToList();
        var unknown = codes.FirstOrDefault(c => apps.All(a => a.Code != c));

        if (unknown is not null)
            throw new BusinessException(MessageCodes.AuthAppUnknown, 400, unknown);

        return apps.Where(a => codes.Contains(a.Code)).ToList();
    }

    // current = the user's role before the change (null when adding), next = the role after it (null when deleting).
    // Only a super admin touches super admins, and the last super admin can neither lose the role nor be deleted.
    private async Task GuardSuperAdminAsync(AuthCallerDto caller, Role? current, Role? next, CancellationToken cancellationToken)
    {
        var wasSuper = current?.Code == RoleCodes.SuperAdmin;
        var isSuper = next?.Code == RoleCodes.SuperAdmin;

        if ((wasSuper || isSuper) && caller.RoleCode != RoleCodes.SuperAdmin)
            throw new BusinessException(MessageCodes.RoleSuperAdminOnly, 403);

        if (wasSuper && !isSuper && await _accessRepository.CountUsersInRoleAsync(current!.Id, cancellationToken) <= 1)
            throw new BusinessException(MessageCodes.AuthLastAdmin, 409);
    }

    #endregion
}
