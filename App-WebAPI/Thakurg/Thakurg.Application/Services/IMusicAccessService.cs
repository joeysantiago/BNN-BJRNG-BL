using Thakurg.Domain.Entities;

namespace Thakurg.Application.Services;

public interface IMusicAccessService
{
    void VerifyEditPassword(MusicPlayer player, string? password);

    Task<string> ResetPasswordAsync(string player, string? masterKey, string? newPassword, CancellationToken cancellationToken);

    Task<string> ChangePasswordAsync(string player, string? currentPassword, string? newPassword, CancellationToken cancellationToken);
}
