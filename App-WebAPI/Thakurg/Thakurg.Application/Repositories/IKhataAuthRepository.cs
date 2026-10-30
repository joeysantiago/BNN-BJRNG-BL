using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IKhataAuthRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task AddOtpAsync(KhataOtp otp, CancellationToken cancellationToken);

    Task AddUserAsync(KhataUser user, CancellationToken cancellationToken);

    Task AddAuditAsync(KhataAuditLog entry, CancellationToken cancellationToken);

    Task<KhataUser?> GetUserAsync(int userId, CancellationToken cancellationToken);

    Task AddSessionAsync(KhataSession session, CancellationToken cancellationToken);

    Task AddPinProofAsync(KhataPinProof proof, CancellationToken cancellationToken);

    Task AddPinAttemptAsync(KhataPinAttempt attempt, CancellationToken cancellationToken);

    Task<KhataSession?> GetSessionAsync(int sessionId, CancellationToken cancellationToken);

    Task<DateTime?> GetLastOtpOnAsync(string identifier, CancellationToken cancellationToken);

    Task<KhataPinProof?> GetPinProofAsync(string proofHash, CancellationToken cancellationToken);

    Task<KhataUser?> FindUserAsync(string? email, string? mobile, CancellationToken cancellationToken);

    Task<int> CountOtpsSinceAsync(string identifier, DateTime since, CancellationToken cancellationToken);

    Task<KhataOtp?> GetActiveOtpAsync(string identifier, DateTime now, CancellationToken cancellationToken);

    Task<KhataSession?> GetSessionByTokenAsync(string refreshTokenHash, CancellationToken cancellationToken);

    Task<bool> IsSessionActiveAsync(int sessionId, int userId, DateTime now, CancellationToken cancellationToken);

    Task RevokeSessionsAsync(int userId, int? exceptSessionId, DateTime now, CancellationToken cancellationToken);
}
