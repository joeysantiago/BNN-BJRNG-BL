namespace Thakurg.Application.Services;

// Where bill photos and contact photos are kept: the Khata:Folder folder of the file store chosen in Settings > Keys. SaveAsync returns the FileId written to
// KhataStoredFiles ({userId}/{bookId}/{name}); OpenAsync gives null when the file is gone.
public interface IKhataFileStore
{
    Task DeleteAsync(string fileId, CancellationToken cancellationToken);

    Task<Stream?> OpenAsync(string fileId, CancellationToken cancellationToken);

    Task<string> SaveAsync(int userId, int bookId, string fileName, byte[] content, CancellationToken cancellationToken);
}
