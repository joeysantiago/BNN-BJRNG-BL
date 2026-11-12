namespace Thakurg.Application.Storage;

// The files of every app (songs, profile pictures, bills, task pictures), kept where Settings > Keys says: the App-Data folder or the Azure Blob container.
// A path is "<app folder>/<name>" with a lower-case app folder, such as "creta/Tum Hi Ho.mp3" or "avatars/12-638.png"; a path with "." or ".." is refused.
public interface IFileStore
{
    Task DeleteAsync(string path, CancellationToken cancellationToken);

    Task<bool> ExistsAsync(string path, CancellationToken cancellationToken);

    Task<Stream?> OpenAsync(string path, CancellationToken cancellationToken);

    Task SaveAsync(string path, Stream content, CancellationToken cancellationToken);
}
