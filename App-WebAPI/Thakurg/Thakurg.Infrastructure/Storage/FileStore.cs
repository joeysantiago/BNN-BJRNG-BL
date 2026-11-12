using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Storage;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Settings;

namespace Thakurg.Infrastructure.Storage;

// Sends every file call to the store chosen in Settings > General (AppSettings Storage.Provider: local or azure), read again every FileStorage:CacheSeconds.
// Files are read only from the chosen store; Settings > General can copy the files of the other store into it.
public class FileStore : IFileStore
{
    private readonly IMemoryCache _cache;

    private readonly FileStorageOptions _options;

    public const string CacheKey = "storage-provider";

    private readonly IEnumerable<IFileBackend> _backends;

    private readonly ISettingsRepository _settingsRepository;

    public FileStore(IEnumerable<IFileBackend> backends, ISettingsRepository settingsRepository, IMemoryCache cache, IOptions<FileStorageOptions> options)
    {
        _backends = backends;
        _settingsRepository = settingsRepository;
        _cache = cache;
        _options = options.Value;
    }

    #region Public Methods

    public async Task DeleteAsync(string path, CancellationToken cancellationToken)
    {
        var backend = await ActiveAsync(cancellationToken);
        await backend.DeleteAsync(path, cancellationToken);
    }

    public async Task<bool> ExistsAsync(string path, CancellationToken cancellationToken)
    {
        var backend = await ActiveAsync(cancellationToken);

        return await backend.SizeAsync(path, cancellationToken) is not null;
    }

    public async Task<Stream?> OpenAsync(string path, CancellationToken cancellationToken)
    {
        var backend = await ActiveAsync(cancellationToken);

        return await backend.OpenAsync(path, cancellationToken);
    }

    public async Task SaveAsync(string path, Stream content, CancellationToken cancellationToken)
    {
        var backend = await ActiveAsync(cancellationToken);
        await backend.SaveAsync(path, content, cancellationToken);
    }

    #endregion

    #region Private Methods

    private async Task<IFileBackend> ActiveAsync(CancellationToken cancellationToken)
    {
        var provider = await _cache.GetOrCreateAsync(CacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(_options.CacheSeconds);

            return StorageRules.Provider(await _settingsRepository.GetSettingValueAsync(SettingCodes.StorageProvider, cancellationToken));
        });

        return _backends.First(b => b.Provider == provider);
    }

    #endregion
}
