using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IUserAccessService
{
    Task<UserAccessDto> GetAsync(CancellationToken cancellationToken);

    Task<string> DeleteAsync(AuthCallerDto caller, int userId, CancellationToken cancellationToken);

    Task<ServiceResultDto<UserDto>> CreateAsync(AuthCallerDto caller, UserCreateDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<UserDto>> UpdateAsync(AuthCallerDto caller, int userId, UserAccessUpdateDto request, CancellationToken cancellationToken);
}
