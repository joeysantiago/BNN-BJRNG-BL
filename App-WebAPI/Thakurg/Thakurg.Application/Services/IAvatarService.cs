using Thakurg.Contracts.Abstractions;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IAvatarService
{
    Task<FileStreamDto> OpenAsync(int userId, CancellationToken cancellationToken);

    Task<ServiceResultDto<UserDto>> RemoveAsync(int userId, CancellationToken cancellationToken);

    Task<ServiceResultDto<UserDto>> SaveAsync(int userId, Stream content, string fileName, long length, CancellationToken cancellationToken);
}
