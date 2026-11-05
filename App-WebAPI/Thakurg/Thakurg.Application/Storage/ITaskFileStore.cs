namespace Thakurg.Application.Storage;

// Where the pictures of tasks are kept. FileId is a path under the store ("<taskUserId>/<name>").
public interface ITaskFileStore
{
    Task DeleteAsync(string fileId);

    Task<Stream?> OpenAsync(string fileId);

    Task SaveAsync(string fileId, byte[] content, CancellationToken cancellationToken);

    Task CopyAsync(string fromFileId, string toFileId, CancellationToken cancellationToken);
}
