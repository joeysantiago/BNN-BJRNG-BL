using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

// Bill photos of entries (KhataAttachments) and the rows that say where their bytes are kept (KhataStoredFiles).
public class KhataAttachmentRepository : IKhataAttachmentRepository
{
    private readonly ICommonDbContext _dbContext;

    public KhataAttachmentRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<KhataAttachment?> GetAttachmentAsync(int attachmentId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataAttachments.WhereActive().FirstOrDefaultAsync(a => a.Id == attachmentId, cancellationToken);
    }

    public Task<List<KhataStoredFile>> GetStoredFilesAsync(int attachmentId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataStoredFiles.WhereActive().Where(f => f.AttachmentId == attachmentId).ToListAsync(cancellationToken);
    }

    public Task<List<KhataAttachment>> GetAttachmentsAsync(int transactionId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataAttachments.AsNoTracking().WhereActive().Where(a => a.TransactionId == transactionId).OrderBy(a => a.SortOrder).ThenBy(a => a.Id).ToListAsync(cancellationToken);
    }

    // The photos and their stored-file rows are saved in one SQL transaction, run through the execution strategy as one unit.
    public async Task AddAsync(List<(KhataAttachment Attachment, KhataStoredFile StoredFile)> photos, CancellationToken cancellationToken)
    {
        var strategy = _dbContext.Database.CreateExecutionStrategy();

        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
            _dbContext.KhataAttachments.AddRange(photos.Select(p => p.Attachment));
            await _dbContext.SaveChangesAsync(cancellationToken);

            foreach (var (attachment, storedFile) in photos)
                storedFile.AttachmentId = attachment.Id;

            _dbContext.KhataStoredFiles.AddRange(photos.Select(p => p.StoredFile));
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        });
    }

    #endregion
}
