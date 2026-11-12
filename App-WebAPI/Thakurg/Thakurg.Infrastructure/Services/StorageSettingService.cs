using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Settings;
using Thakurg.Contracts.Storage;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Storage;

namespace Thakurg.Infrastructure.Services;

// Settings > Keys > File storage (super admin, password session only): one site-wide choice of where every app keeps its files, the App-Data folder
// or the Azure Blob container. Azure can be chosen only when the server has its connection string. The copy moves the files of the other store into one.
public class StorageSettingService : IStorageSettingService
{
    private readonly IMemoryCache _cache;

    private readonly FileStorageOptions _options;

    private readonly IMessageService _messageService;

    private readonly IEnumerable<IFileBackend> _backends;

    private readonly ILogger<StorageSettingService> _logger;

    private readonly ISettingsRepository _settingsRepository;

    public StorageSettingService(IEnumerable<IFileBackend> backends, ISettingsRepository settingsRepository, IMessageService messageService, IMemoryCache cache, IOptions<FileStorageOptions> options, ILogger<StorageSettingService> logger)
    {
        _backends = backends;
        _settingsRepository = settingsRepository;
        _messageService = messageService;
        _cache = cache;
        _options = options.Value;
        _logger = logger;
    }

    #region Public Methods

    // Reaches the chosen store: the App-Data folder, or the container with the server's connection string.
    public async Task<string> TestAsync(CancellationToken cancellationToken)
    {
        var backend = Backend(await ProviderAsync(cancellationToken));

        if (!backend.IsReady)
            throw new BusinessException(MessageCodes.StorageNotConfigured, 400);

        return await backend.CheckAsync(cancellationToken) ? await _messageService.GetAsync(MessageCodes.StorageReachable) : throw new BusinessException(MessageCodes.StorageUnreachable, 400);
    }

    public async Task<StorageSettingDto> GetAsync(CancellationToken cancellationToken)
    {
        return ToDto(await ProviderAsync(cancellationToken));
    }

    // Copies every file of the other store into target (local or azure) under the same path. A file already there with the same size is skipped.
    public async Task<string> CopyAsync(string target, CancellationToken cancellationToken)
    {
        var to = Backend(Valid(target));
        var from = _backends.First(b => b.Provider != to.Provider);

        if (!from.IsReady || !to.IsReady)
            throw new BusinessException(MessageCodes.StorageNotConfigured, 400);

        var copied = 0;
        var skipped = 0;

        foreach (var path in await from.ListAsync(cancellationToken))
        {
            var size = await from.SizeAsync(path, cancellationToken);

            if (size is not null && size == await to.SizeAsync(path, cancellationToken))
            {
                skipped++;
                continue;
            }

            await using var content = await from.OpenAsync(path, cancellationToken);

            if (content is null)
                continue;

            await to.SaveAsync(path, content, cancellationToken);
            copied++;
        }

        _logger.LogInformation("Copied {Copied} files from {From} to {To}; {Skipped} were already there", copied, from.Provider, to.Provider, skipped);

        return await _messageService.GetAsync(MessageCodes.StorageCopied, copied, skipped);
    }

    public async Task<ServiceResultDto<StorageSettingDto>> SaveAsync(StorageSettingRequestDto request, CancellationToken cancellationToken)
    {
        var provider = Valid(request.Provider);

        if (!Backend(provider).IsReady)
            throw new BusinessException(MessageCodes.StorageNotConfigured, 400);

        await _settingsRepository.UpdateAsync([], [], [], new Dictionary<string, string> { [SettingCodes.StorageProvider] = provider }, cancellationToken);
        _cache.Remove(FileStore.CacheKey);

        return new ServiceResultDto<StorageSettingDto> { Data = ToDto(provider), Message = await _messageService.GetAsync(MessageCodes.StorageSaved) };
    }

    #endregion

    #region Private Methods

    private IFileBackend Backend(string provider)
    {
        return _backends.First(b => b.Provider == provider);
    }

    private static string Valid(string? provider)
    {
        var text = provider?.Trim().ToLowerInvariant();

        return text is StorageProviders.Local or StorageProviders.Azure ? text : throw new BusinessException(MessageCodes.StorageInvalid, 400);
    }

    private StorageSettingDto ToDto(string provider)
    {
        return new StorageSettingDto { Provider = provider, AzureReady = Backend(StorageProviders.Azure).IsReady, LocalRoot = _options.LocalRoot, ContainerName = _options.ContainerName, EnvironmentFolder = _options.EnvironmentFolder };
    }

    private async Task<string> ProviderAsync(CancellationToken cancellationToken)
    {
        return StorageRules.Provider(await _settingsRepository.GetSettingValueAsync(SettingCodes.StorageProvider, cancellationToken));
    }

    #endregion
}
