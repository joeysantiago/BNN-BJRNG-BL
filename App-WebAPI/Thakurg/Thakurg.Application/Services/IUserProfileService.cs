using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IUserProfileService
{
    Task<ProfileDetailsDto> GetAsync(int userId, CancellationToken cancellationToken);

    Task<ServiceResultDto<ProfileDetailsDto>> SaveAsync(int userId, ProfileDetailsDto request, CancellationToken cancellationToken);
}
