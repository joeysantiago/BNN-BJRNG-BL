using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IKhataAttachmentRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task<KhataAttachment?> GetAttachmentAsync(int attachmentId, CancellationToken cancellationToken);

    Task<List<KhataStoredFile>> GetStoredFilesAsync(int attachmentId, CancellationToken cancellationToken);

    Task<List<KhataAttachment>> GetAttachmentsAsync(int transactionId, CancellationToken cancellationToken);

    Task AddAsync(List<(KhataAttachment Attachment, KhataStoredFile StoredFile)> photos, CancellationToken cancellationToken);
}
