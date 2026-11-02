using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Roles;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IRolePermissionService
{
    Task<RolePermissionListDto> GetAsync(int roleId, CancellationToken cancellationToken);

    Task<string> DeleteAsync(AuthCallerDto caller, int permissionId, CancellationToken cancellationToken);

    Task<ServiceResultDto<RolePermissionDto>> CreateAsync(AuthCallerDto caller, RolePermissionSaveDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<RolePermissionDto>> UpdateAsync(AuthCallerDto caller, int permissionId, RolePermissionSaveDto request, CancellationToken cancellationToken);
}
