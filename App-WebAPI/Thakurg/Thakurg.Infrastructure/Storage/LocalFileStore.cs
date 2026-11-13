using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Storage;

namespace Thakurg.Infrastructure.Storage;

// Files on the API's disk under FileStorage:LocalRoot (App-Data) as <root>/<path>, such as App-Data/creta/song.mp3. A path that leads outside the root is never read or written.
public class LocalFileStore : IFileBackend
{
    public bool IsReady => true;

    private readonly string _root;

    private const int BufferSize = 81920;

    public string Provider => StorageProviders.Local;

    public LocalFileStore(IOptions<FileStorageOptions> options, IHostEnvironment environment)
    {
        _root = Path.GetFullPath(Path.Combine(environment.ContentRootPath, options.Value.LocalRoot));
    }

    #region Public Methods

    public Task<bool> CheckAsync(CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(_root);

        return Task.FromResult(Directory.Exists(_root));
    }

    public Task<List<string>> ListAsync(CancellationToken cancellationToken)
    {
        if (!Directory.Exists(_root))
            return Task.FromResult(new List<string>());

        return Task.FromResult(Directory.EnumerateFiles(_root, "*", SearchOption.AllDirectories).Select(f => Path.GetRelativePath(_root, f).Replace(Path.DirectorySeparatorChar, '/')).ToList());
    }

    public Task DeleteAsync(string path, CancellationToken cancellationToken)
    {
        var full = FullPath(path);

        if (full is not null && File.Exists(full))
            File.Delete(full);

        return Task.CompletedTask;
    }

    public Task<long?> SizeAsync(string path, CancellationToken cancellationToken)
    {
        var full = FullPath(path);

        return Task.FromResult(full is not null && File.Exists(full) ? new FileInfo(full).Length : (long?)null);
    }

    public Task<Stream?> OpenAsync(string path, CancellationToken cancellationToken)
    {
        var full = FullPath(path);

        return Task.FromResult<Stream?>(full is not null && File.Exists(full) ? new FileStream(full, FileMode.Open, FileAccess.Read, FileShare.Read, BufferSize, true) : null);
    }

    public async Task SaveAsync(string path, Stream content, CancellationToken cancellationToken)
    {
        var full = FullPath(path) ?? throw new InvalidOperationException("The file path leads outside FileStorage:LocalRoot.");
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);

        await using var target = new FileStream(full, FileMode.Create, FileAccess.Write, FileShare.None, BufferSize, true);
        await content.CopyToAsync(target, cancellationToken);
    }

    public Task<List<string>> ListFolderAsync(string folder, CancellationToken cancellationToken)
    {
        var full = FullPath(folder);

        if (full is null || !Directory.Exists(full))
            return Task.FromResult(new List<string>());

        return Task.FromResult(Directory.EnumerateFiles(full).Select(Path.GetFileName).OfType<string>().ToList());
    }

    #endregion

    #region Private Methods

    private string? FullPath(string path)
    {
        var relative = StorageRules.CleanPath(path);

        if (relative is null)
            return null;

        var full = Path.GetFullPath(Path.Combine(_root, relative));

        return full.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) ? full : null;
    }

    #endregion
}
