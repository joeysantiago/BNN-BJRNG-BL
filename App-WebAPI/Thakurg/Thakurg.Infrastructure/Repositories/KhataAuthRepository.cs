using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class KhataAuthRepository : IKhataAuthRepository
{
    private readonly ICommonDbContext _dbContext;

    public KhataAuthRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddOtpAsync(KhataOtp otp, CancellationToken cancellationToken)
    {
        _dbContext.KhataOtps.Add(otp);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddUserAsync(KhataUser user, CancellationToken cancellationToken)
    {
        _dbContext.KhataUsers.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<KhataUser?> GetUserAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataUsers.WhereActive().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    public async Task AddAuditAsync(KhataAuditLog entry, CancellationToken cancellationToken)
    {
        _dbContext.KhataAuditLogs.Add(entry);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddSessionAsync(KhataSession session, CancellationToken cancellationToken)
    {
        _dbContext.KhataSessions.Add(session);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddPinProofAsync(KhataPinProof proof, CancellationToken cancellationToken)
    {
        _dbContext.KhataPinProofs.Add(proof);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<KhataSession?> GetSessionAsync(int sessionId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataSessions.WhereActive().FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);
    }

    public Task<DateTime?> GetLastOtpOnAsync(string identifier, CancellationToken cancellationToken)
    {
        return _dbContext.KhataOtps.AsNoTracking().Where(o => o.Identifier == identifier).OrderByDescending(o => o.CreatedOn).Select(o => (DateTime?)o.CreatedOn).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task AddPinAttemptAsync(KhataPinAttempt attempt, CancellationToken cancellationToken)
    {
        _dbContext.KhataPinAttempts.Add(attempt);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<KhataPinProof?> GetPinProofAsync(string proofHash, CancellationToken cancellationToken)
    {
        return _dbContext.KhataPinProofs.WhereActive().FirstOrDefaultAsync(p => p.ProofHash == proofHash, cancellationToken);
    }

    public Task<KhataUser?> FindUserAsync(string? email, string? mobile, CancellationToken cancellationToken)
    {
        return _dbContext.KhataUsers.WhereActive().FirstOrDefaultAsync(u => (email != null && u.Email == email) || (mobile != null && u.Mobile == mobile), cancellationToken);
    }

    public Task<int> CountOtpsSinceAsync(string identifier, DateTime since, CancellationToken cancellationToken)
    {
        return _dbContext.KhataOtps.CountAsync(o => o.Identifier == identifier && o.CreatedOn >= since, cancellationToken);
    }

    public Task<KhataOtp?> GetActiveOtpAsync(string identifier, DateTime now, CancellationToken cancellationToken)
    {
        return _dbContext.KhataOtps.Where(o => o.Identifier == identifier && o.ConsumedOn == null && o.ExpiresOn > now).OrderByDescending(o => o.CreatedOn).FirstOrDefaultAsync(cancellationToken);
    }

    public Task<KhataSession?> GetSessionByTokenAsync(string refreshTokenHash, CancellationToken cancellationToken)
    {
        return _dbContext.KhataSessions.WhereActive().FirstOrDefaultAsync(s => s.RefreshTokenHash == refreshTokenHash, cancellationToken);
    }

    public Task<bool> IsSessionActiveAsync(int sessionId, int userId, DateTime now, CancellationToken cancellationToken)
    {
        return _dbContext.KhataSessions.AsNoTracking().WhereActive().AnyAsync(s => s.Id == sessionId && s.UserId == userId && s.RevokedOn == null && s.ExpiresOn > now, cancellationToken);
    }

    public Task RevokeSessionsAsync(int userId, int? exceptSessionId, DateTime now, CancellationToken cancellationToken)
    {
        return _dbContext.KhataSessions.Where(s => s.UserId == userId && s.RevokedOn == null && (exceptSessionId == null || s.Id != exceptSessionId)).ExecuteUpdateAsync(u => u.SetProperty(s => s.RevokedOn, now).SetProperty(s => s.ModifiedOn, now), cancellationToken);
    }

    #endregion
}
