using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Thakurg.Application.Storage;
using Thakurg.Contracts.Configurations;

namespace Thakurg.Infrastructure.Storage;

// The pictures of tasks on the disk of the server, under Tasks:LocalFiles:Root (App-Data/tasks, never committed). A FileId may never leave that folder.
public class LocalTaskFileStore : ITaskFileStore
{
    private readonly string _root;

    public LocalTaskFileStore(IOptions<TasksOptions> options, IHostEnvironment environment)
    {
        _root = Path.GetFullPath(Path.Combine(environment.ContentRootPath, options.Value.LocalFiles.Root));
    }

    #region Public Methods

    public Task DeleteAsync(string fileId)
    {
        var path = FullPath(fileId);

        if (File.Exists(path))
            File.Delete(path);

        return Task.CompletedTask;
    }

    public Task<Stream?> OpenAsync(string fileId)
    {
        var path = FullPath(fileId);

        return Task.FromResult<Stream?>(File.Exists(path) ? File.OpenRead(path) : null);
    }

    public async Task SaveAsync(string fileId, byte[] content, CancellationToken cancellationToken)
    {
        var path = FullPath(fileId);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllBytesAsync(path, content, cancellationToken);
    }

    public async Task CopyAsync(string fromFileId, string toFileId, CancellationToken cancellationToken)
    {
        await SaveAsync(toFileId, await File.ReadAllBytesAsync(FullPath(fromFileId), cancellationToken), cancellationToken);
    }

    #endregion

    #region Private Methods

    private string FullPath(string fileId)
    {
        var path = Path.GetFullPath(Path.Combine(_root, fileId));

        if (!path.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("The file is outside the tasks folder.");

        return path;
    }

    #endregion
}
