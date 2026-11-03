using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Khata;

namespace Thakurg.Infrastructure.Services;

// Bill photos on the API's disk, in Khata:LocalFiles:Root (App-Data/khata, never committed) as {userId}/{bookId}/{name}. A FileId that would lead outside the root is ignored.
public class LocalKhataFileStore : IKhataFileStore
{
    private readonly string _root;

    public KhataStorageProvider Provider => KhataStorageProvider.Local;

    public LocalKhataFileStore(IOptions<KhataOptions> options, IHostEnvironment environment)
    {
        _root = Path.GetFullPath(Path.Combine(environment.ContentRootPath, options.Value.LocalFiles.Root));
    }

    #region Public Methods

    public Task DeleteAsync(string fileId, CancellationToken cancellationToken)
    {
        var path = FullPath(fileId);

        if (path is not null && File.Exists(path))
            File.Delete(path);

        return Task.CompletedTask;
    }

    public Task<Stream?> OpenAsync(string fileId, CancellationToken cancellationToken)
    {
        var path = FullPath(fileId);

        return Task.FromResult<Stream?>(path is not null && File.Exists(path) ? File.OpenRead(path) : null);
    }

    public async Task<string> SaveAsync(int userId, int bookId, string fileName, byte[] content, string contentType, CancellationToken cancellationToken)
    {
        var fileId = $"{userId}/{bookId}/{fileName}";
        var path = FullPath(fileId) ?? throw new InvalidOperationException("The photo name leads outside Khata:LocalFiles:Root.");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllBytesAsync(path, content, cancellationToken);

        return fileId;
    }

    #endregion

    #region Private Methods

    private string? FullPath(string fileId)
    {
        var path = Path.GetFullPath(Path.Combine(_root, fileId));

        return path.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) ? path : null;
    }

    #endregion
}
