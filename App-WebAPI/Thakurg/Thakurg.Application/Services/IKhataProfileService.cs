namespace Thakurg.Application.Services;

public interface IKhataProfileService
{
    Task<int> ResolveAsync(int accountUserId, CancellationToken cancellationToken);
}
