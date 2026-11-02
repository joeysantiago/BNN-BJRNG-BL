using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Roles;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

// The Role rights tab of the Settings page: which pages each role may view, add to, edit and delete on. A page given to a role is one RolePermissions row.
// Add and Delete are kept only on pages where they mean something (Pages.HasAdd / HasDelete), and any right includes View.
// Only a super admin changes the rights of the super admin role (which has every right anyway). The role's users get the change at once.
public class RolePermissionService : IRolePermissionService
{
    private readonly IAuthSessionCache _sessionCache;

    private readonly IMessageService _messageService;

    private readonly IRoleRepository _roleRepository;

    public RolePermissionService(IMessageService messageService, IRoleRepository roleRepository, IAuthSessionCache sessionCache)
    {
        _messageService = messageService;
        _roleRepository = roleRepository;
        _sessionCache = sessionCache;
    }

    #region Public Methods

    // roleId 0 opens the first role.
    public async Task<RolePermissionListDto> GetAsync(int roleId, CancellationToken cancellationToken)
    {
        var roles = await _roleRepository.GetRolesAsync(cancellationToken);
        var role = roles.FirstOrDefault(r => roleId == 0 || r.Id == roleId) ?? throw new BusinessException(MessageCodes.RoleNotFound, 404);
        var pages = await _roleRepository.GetPagesAsync(cancellationToken);
        var rows = await _roleRepository.GetPermissionsAsync(role.Id, cancellationToken);

        return new RolePermissionListDto
        {
            RoleId = role.Id,
            Roles = roles.Select(r => new RoleDto { Id = r.Id, Code = r.Code, Name = r.Name, Description = r.Description, IsSystem = r.IsSystem, IsDefault = r.IsDefault, SortOrder = r.SortOrder }).ToList(),
            Pages = pages.Select(p => new PageDto { Id = p.Id, Code = p.Code, HasAdd = p.HasAdd, HasDelete = p.HasDelete }).ToList(),
            Permissions = rows.Where(r => pages.Any(p => p.Id == r.PageId)).OrderBy(r => pages.FindIndex(p => p.Id == r.PageId)).Select(r => ToDto(r, pages.First(p => p.Id == r.PageId))).ToList()
        };
    }

    public async Task<string> DeleteAsync(AuthCallerDto caller, int permissionId, CancellationToken cancellationToken)
    {
        var row = await _roleRepository.GetPermissionAsync(permissionId, cancellationToken) ?? throw new BusinessException(MessageCodes.PermissionNotFound, 404);
        await RequireRoleAsync(caller, row.RoleId, cancellationToken);
        _roleRepository.RemovePermission(row);
        await _roleRepository.SaveChangesAsync(cancellationToken);
        await ForgetUsersAsync(row.RoleId, cancellationToken);

        return await _messageService.GetAsync(MessageCodes.PermissionDeleted);
    }

    public async Task<ServiceResultDto<RolePermissionDto>> CreateAsync(AuthCallerDto caller, RolePermissionSaveDto request, CancellationToken cancellationToken)
    {
        var role = await RequireRoleAsync(caller, request.RoleId, cancellationToken);
        var page = await _roleRepository.GetPageAsync(request.PageId, cancellationToken) ?? throw new BusinessException(MessageCodes.PermissionPageUnknown, 400);

        if (await _roleRepository.PermissionExistsAsync(role.Id, page.Id, cancellationToken))
            throw new BusinessException(MessageCodes.PermissionExists, 409);

        var row = new RolePermission { RoleId = role.Id, PageId = page.Id, CreatedBy = caller.UserId };
        Apply(row, request, page);
        _roleRepository.AddPermission(row);
        await _roleRepository.SaveChangesAsync(cancellationToken);
        await ForgetUsersAsync(role.Id, cancellationToken);

        return new ServiceResultDto<RolePermissionDto> { Data = ToDto(row, page), Message = await _messageService.GetAsync(MessageCodes.PermissionSaved) };
    }

    public async Task<ServiceResultDto<RolePermissionDto>> UpdateAsync(AuthCallerDto caller, int permissionId, RolePermissionSaveDto request, CancellationToken cancellationToken)
    {
        var row = await _roleRepository.GetPermissionAsync(permissionId, cancellationToken) ?? throw new BusinessException(MessageCodes.PermissionNotFound, 404);
        await RequireRoleAsync(caller, row.RoleId, cancellationToken);
        var page = await _roleRepository.GetPageAsync(row.PageId, cancellationToken) ?? throw new BusinessException(MessageCodes.PermissionPageUnknown, 400);
        Apply(row, request, page);
        row.ModifiedBy = caller.UserId;
        row.ModifiedOn = DateTime.UtcNow;
        await _roleRepository.SaveChangesAsync(cancellationToken);
        await ForgetUsersAsync(row.RoleId, cancellationToken);

        return new ServiceResultDto<RolePermissionDto> { Data = ToDto(row, page), Message = await _messageService.GetAsync(MessageCodes.PermissionSaved) };
    }

    #endregion

    #region Private Methods

    private static RolePermissionDto ToDto(RolePermission row, Page page)
    {
        return new RolePermissionDto { Id = row.Id, RoleId = row.RoleId, PageId = row.PageId, PageCode = page.Code, CanView = row.CanView, CanAdd = row.CanAdd, CanEdit = row.CanEdit, CanDelete = row.CanDelete };
    }

    private async Task ForgetUsersAsync(int roleId, CancellationToken cancellationToken)
    {
        foreach (var userId in await _roleRepository.GetUserIdsInRoleAsync(roleId, cancellationToken))
            _sessionCache.Forget(userId);
    }

    private static void Apply(RolePermission row, RolePermissionSaveDto request, Page page)
    {
        row.CanAdd = request.CanAdd && page.HasAdd;
        row.CanEdit = request.CanEdit;
        row.CanDelete = request.CanDelete && page.HasDelete;
        row.CanView = request.CanView || row.CanAdd || row.CanEdit || row.CanDelete;
    }

    private async Task<Role> RequireRoleAsync(AuthCallerDto caller, int roleId, CancellationToken cancellationToken)
    {
        var role = await _roleRepository.GetRoleAsync(roleId, cancellationToken) ?? throw new BusinessException(MessageCodes.RoleNotFound, 404);

        if (role.Code == RoleCodes.SuperAdmin && caller.RoleCode != RoleCodes.SuperAdmin)
            throw new BusinessException(MessageCodes.RoleSuperAdminOnly, 403);

        return role;
    }

    #endregion
}
