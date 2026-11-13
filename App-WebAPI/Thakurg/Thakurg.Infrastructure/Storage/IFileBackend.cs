namespace Thakurg.Infrastructure.Storage;

// One place files can be kept: the App-Data folder (LocalFileStore) or the Azure Blob container (AzureBlobFileStore). FileStore uses the one chosen
// in Settings > General; the copy in Settings > General moves every file from one to the other under the same path.
public interface IFileBackend
{
    bool IsReady { get; }

    string Provider { get; }

    Task<bool> CheckAsync(CancellationToken cancellationToken);

    Task<List<string>> ListAsync(CancellationToken cancellationToken);

    Task DeleteAsync(string path, CancellationToken cancellationToken);

    Task<long?> SizeAsync(string path, CancellationToken cancellationToken);

    Task<Stream?> OpenAsync(string path, CancellationToken cancellationToken);

    Task SaveAsync(string path, Stream content, CancellationToken cancellationToken);

    // The names of the files directly in one folder, such as "creta" (files in its subfolders are not listed).
    Task<List<string>> ListFolderAsync(string folder, CancellationToken cancellationToken);
}
