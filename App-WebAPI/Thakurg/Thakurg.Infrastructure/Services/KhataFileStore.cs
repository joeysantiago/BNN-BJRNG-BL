using Microsoft.Extensions.Options;
using Thakurg.Application.Services;
using Thakurg.Application.Storage;
using Thakurg.Contracts.Configurations;

namespace Thakurg.Infrastructure.Services;

// Bill photos and contact photos in the file store chosen in Settings > Keys, in the Khata:Folder folder: App-Data/khata/{userId}/{bookId}/{name} or
// <env>/khata/{userId}/{bookId}/{name} in the container. The FileId saved in KhataStoredFiles is {userId}/{bookId}/{name}.
public class KhataFileStore : IKhataFileStore
{
    private readonly string _folder;

    private readonly IFileStore _fileStore;

    public KhataFileStore(IOptions<KhataOptions> options, IFileStore fileStore)
    {
        _folder = options.Value.Folder;
        _fileStore = fileStore;
    }

    #region Public Methods

    public Task DeleteAsync(string fileId, CancellationToken cancellationToken)
    {
        return _fileStore.DeleteAsync(PathOf(fileId), cancellationToken);
    }

    public Task<Stream?> OpenAsync(string fileId, CancellationToken cancellationToken)
    {
        return _fileStore.OpenAsync(PathOf(fileId), cancellationToken);
    }

    public async Task<string> SaveAsync(int userId, int bookId, string fileName, byte[] content, CancellationToken cancellationToken)
    {
        var fileId = $"{userId}/{bookId}/{fileName}";
        await using var stream = new MemoryStream(content);
        await _fileStore.SaveAsync(PathOf(fileId), stream, cancellationToken);

        return fileId;
    }

    #endregion

    #region Private Methods

    private string PathOf(string fileId)
    {
        return $"{_folder}/{fileId}";
    }

    #endregion
}
