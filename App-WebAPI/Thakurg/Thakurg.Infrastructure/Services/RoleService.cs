using System.Text.RegularExpressions;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Roles;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

// The Roles tab of the Settings page. Built-in roles (IsSystem) keep their code and cannot be deleted; a role that users still have cannot be deleted;
// exactly one role is the sign-up role (IsDefault), and it is never the super admin role. Only a super admin changes the super admin role.
public class RoleService : IRoleService
{
    private const int MaxCodeLength = 50;

    private const int MaxNameLength = 100;

    private const int MaxDescriptionLength = 250;

    private readonly IAuthSessionCache _sessionCache;

    private readonly IMessageService _messageService;

    private readonly IRoleRepository _roleRepository;

    private static readonly Regex CodePattern = new("^[a-z][a-z0-9-]{1,49}$", RegexOptions.Compiled);

    public RoleService(IMessageService messageService, IRoleRepository roleRepository, IAuthSessionCache sessionCache)
    {
        _messageService = messageService;
        _roleRepository = roleRepository;
        _sessionCache = sessionCache;
    }

    #region Public Methods

    public async Task<List<RoleDto>> GetAsync(CancellationToken cancellationToken)
    {
        var roles = await _roleRepository.GetRolesAsync(cancellationToken);
        var counts = await _roleRepository.CountUsersAsync(cancellationToken);

        return roles.Select(r => ToDto(r, counts.GetValueOrDefault(r.Id))).ToList();
    }

    public async Task<string> DeleteAsync(AuthCallerDto caller, int roleId, CancellationToken cancellationToken)
    {
        var role = await _roleRepository.GetRoleAsync(roleId, cancellationToken) ?? throw new BusinessException(MessageCodes.RoleNotFound, 404);

        if (role.IsSystem)
            throw new BusinessException(MessageCodes.RoleSystemLocked, 409);

        if (role.IsDefault)
            throw new BusinessException(MessageCodes.RoleDefaultRequired, 409);

        var users = await _roleRepository.CountUsersInRoleAsync(role.Id, cancellationToken);

        if (users > 0)
            throw new BusinessException(MessageCodes.RoleInUse, 409, users);

        role.IsSoftDeleted = true;
        role.ModifiedBy = caller.UserId;
        role.ModifiedOn = DateTime.UtcNow;
        await _roleRepository.RemovePermissionsOfRoleAsync(role.Id, cancellationToken);
        await _roleRepository.SaveChangesAsync(cancellationToken);

        return await _messageService.GetAsync(MessageCodes.RoleDeleted);
    }

    public async Task<ServiceResultDto<RoleDto>> CreateAsync(AuthCallerDto caller, RoleSaveDto request, CancellationToken cancellationToken)
    {
        var code = Validate(request);

        if (await _roleRepository.CodeExistsAsync(code, 0, cancellationToken))
            throw new BusinessException(MessageCodes.RoleCodeTaken, 409, code);

        var role = new Role { Code = code, Name = request.Name!.Trim(), Description = Clean(request.Description), IsDefault = request.IsDefault, SortOrder = request.SortOrder, CreatedBy = caller.UserId };
        _roleRepository.AddRole(role);
        await _roleRepository.SaveChangesAsync(cancellationToken);

        if (role.IsDefault)
        {
            await _roleRepository.ClearDefaultAsync(role.Id, cancellationToken);
            await _roleRepository.SaveChangesAsync(cancellationToken);
        }

        return new ServiceResultDto<RoleDto> { Data = ToDto(role, 0), Message = await _messageService.GetAsync(MessageCodes.RoleSaved) };
    }

    public async Task<ServiceResultDto<RoleDto>> UpdateAsync(AuthCallerDto caller, int roleId, RoleSaveDto request, CancellationToken cancellationToken)
    {
        var role = await _roleRepository.GetRoleAsync(roleId, cancellationToken) ?? throw new BusinessException(MessageCodes.RoleNotFound, 404);
        if (role.Code == RoleCodes.SuperAdmin && caller.RoleCode != RoleCodes.SuperAdmin)
            throw new BusinessException(MessageCodes.RoleSuperAdminOnly, 403);

        if (role.IsSystem && !string.IsNullOrWhiteSpace(request.Code) && request.Code.Trim() != role.Code)
            throw new BusinessException(MessageCodes.RoleSystemLocked, 409);

        var code = Validate(new RoleSaveDto { Code = role.IsSystem ? role.Code : request.Code, Name = request.Name, Description = request.Description, IsDefault = request.IsDefault });

        if (role.IsDefault && !request.IsDefault)
            throw new BusinessException(MessageCodes.RoleDefaultRequired, 409);

        if (await _roleRepository.CodeExistsAsync(code, role.Id, cancellationToken))
            throw new BusinessException(MessageCodes.RoleCodeTaken, 409, code);

        role.Code = code;
        role.Name = request.Name!.Trim();
        role.Description = Clean(request.Description);
        role.IsDefault = request.IsDefault;
        role.SortOrder = request.SortOrder;
        role.ModifiedBy = caller.UserId;
        role.ModifiedOn = DateTime.UtcNow;

        if (role.IsDefault)
            await _roleRepository.ClearDefaultAsync(role.Id, cancellationToken);

        await _roleRepository.SaveChangesAsync(cancellationToken);
        await ForgetUsersAsync(role.Id, cancellationToken);
        var users = await _roleRepository.CountUsersInRoleAsync(role.Id, cancellationToken);

        return new ServiceResultDto<RoleDto> { Data = ToDto(role, users), Message = await _messageService.GetAsync(MessageCodes.RoleSaved) };
    }

    #endregion

    #region Private Methods

    private static string? Clean(string? description)
    {
        return string.IsNullOrWhiteSpace(description) ? null : description.Trim();
    }

    // The trimmed code; the name and description must fit, and the super admin role is never the sign-up role.
    private static string Validate(RoleSaveDto request)
    {
        var code = (request.Code ?? string.Empty).Trim();
        var name = (request.Name ?? string.Empty).Trim();

        if (!CodePattern.IsMatch(code) || name.Length is 0 or > MaxNameLength || Clean(request.Description)?.Length > MaxDescriptionLength)
            throw new BusinessException(MessageCodes.RoleInvalid, 400, MaxCodeLength, MaxNameLength, MaxDescriptionLength);

        if (request.IsDefault && code == RoleCodes.SuperAdmin)
            throw new BusinessException(MessageCodes.RoleDefaultInvalid, 400);

        return code;
    }

    private static RoleDto ToDto(Role role, int userCount)
    {
        return new RoleDto { Id = role.Id, Code = role.Code, Name = role.Name, Description = role.Description, IsSystem = role.IsSystem, IsDefault = role.IsDefault, SortOrder = role.SortOrder, UserCount = userCount };
    }

    // The users of a changed role get their new role code at once, not after Auth:SessionCacheSeconds.
    private async Task ForgetUsersAsync(int roleId, CancellationToken cancellationToken)
    {
        foreach (var userId in await _roleRepository.GetUserIdsInRoleAsync(roleId, cancellationToken))
            _sessionCache.Forget(userId);
    }

    #endregion
}
