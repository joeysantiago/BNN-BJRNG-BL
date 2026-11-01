using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Thakurg.Application.Storage;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;

namespace Thakurg.Infrastructure.Storage;

public class MusicFileStore : IMusicFileStore
{
    private readonly string _root;

    public MusicFileStore(IOptions<MusicStorageOptions> options, IHostEnvironment environment)
    {
        _root = Path.GetFullPath(Path.Combine(environment.ContentRootPath, options.Value.Root));
    }

    #region Public Methods

    public bool Exists(string folder, string fileName)
    {
        return File.Exists(PathOf(folder, fileName));
    }

    public void Delete(string folder, string fileName)
    {
        var path = PathOf(folder, fileName);

        if (File.Exists(path))
            File.Delete(path);
    }

    public Stream? Open(string folder, string fileName)
    {
        var path = PathOf(folder, fileName);

        return File.Exists(path) ? new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, true) : null;
    }

    public async Task SaveAsync(string folder, string fileName, Stream content, CancellationToken cancellationToken)
    {
        var path = PathOf(folder, fileName);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        await using var target = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None, 81920, true);
        await content.CopyToAsync(target, cancellationToken);
    }

    #endregion

    #region Private Methods

    private string PathOf(string folder, string fileName)
    {
        var full = Path.GetFullPath(Path.Combine(_root, folder, fileName));

        if (!full.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new BusinessException(MessageCodes.MusicFileMissing, 404);

        return full;
    }

    #endregion
}
