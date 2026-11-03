using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

// One place bill photos are kept. SaveAsync returns the FileId written to KhataStoredFiles; OpenAsync gives null when the file is gone.
public interface IKhataFileStore
{
    KhataStorageProvider Provider { get; }

    Task DeleteAsync(string fileId, CancellationToken cancellationToken);

    Task<Stream?> OpenAsync(string fileId, CancellationToken cancellationToken);

    Task<string> SaveAsync(int userId, int bookId, string fileName, byte[] content, string contentType, CancellationToken cancellationToken);
}
