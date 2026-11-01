using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IUserAccessService
{
    Task<UserAccessDto> GetAsync(CancellationToken cancellationToken);

    Task<ServiceResultDto<UserDto>> UpdateAsync(int adminUserId, int userId, UserAccessUpdateDto request, CancellationToken cancellationToken);
}
