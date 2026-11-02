using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Roles;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IRoleService
{
    Task<List<RoleDto>> GetAsync(CancellationToken cancellationToken);

    Task<string> DeleteAsync(AuthCallerDto caller, int roleId, CancellationToken cancellationToken);

    Task<ServiceResultDto<RoleDto>> CreateAsync(AuthCallerDto caller, RoleSaveDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<RoleDto>> UpdateAsync(AuthCallerDto caller, int roleId, RoleSaveDto request, CancellationToken cancellationToken);
}
