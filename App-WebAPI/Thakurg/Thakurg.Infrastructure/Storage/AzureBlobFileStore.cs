using Azure;
using Azure.Core;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Storage;

namespace Thakurg.Infrastructure.Storage;

// Files in the FileStorage:ContainerName Blob container (app-data) as <EnvironmentFolder>/<path>, such as QA/creta/song.mp3 or thakurg/avatars/12-638.png.
// The connection string is the configuration value named FileStorage:ConnectionStringName (the AzureStorageConnectionString environment variable, or a
// connection string of that name); without it every call fails with StorageNotConfigured. The container is made on first use.
public class AzureBlobFileStore : IFileBackend
{
    private readonly string _prefix;

    private BlobContainerClient? _container;

    private readonly FileStorageOptions _options;

    private readonly IConfiguration _configuration;

    private readonly SemaphoreSlim _gate = new(1, 1);

    public string Provider => StorageProviders.Azure;

    private readonly ILogger<AzureBlobFileStore> _logger;

    public bool IsReady => ConnectionString() is not null;

    private static readonly FileExtensionContentTypeProvider ContentTypes = new();

    public AzureBlobFileStore(IOptions<FileStorageOptions> options, IConfiguration configuration, ILogger<AzureBlobFileStore> logger)
    {
        _options = options.Value;
        _prefix = $"{_options.EnvironmentFolder.Trim('/')}/";
        _configuration = configuration;
        _logger = logger;
    }

    #region Public Methods

    public async Task<bool> CheckAsync(CancellationToken cancellationToken)
    {
        try
        {
            var container = await ContainerAsync(cancellationToken);

            return await container.ExistsAsync(cancellationToken);
        }
        catch (RequestFailedException ex)
        {
            _logger.LogWarning(ex, "The storage container {Container} could not be reached", _options.ContainerName);

            return false;
        }
    }

    public async Task<List<string>> ListAsync(CancellationToken cancellationToken)
    {
        var container = await ContainerAsync(cancellationToken);
        var paths = new List<string>();

        await foreach (var blob in container.GetBlobsAsync(BlobTraits.None, BlobStates.None, _prefix, cancellationToken))
            paths.Add(blob.Name[_prefix.Length..]);

        return paths;
    }

    public async Task DeleteAsync(string path, CancellationToken cancellationToken)
    {
        var name = BlobName(path);

        if (name is null)
            return;

        var container = await ContainerAsync(cancellationToken);
        await container.DeleteBlobIfExistsAsync(name, cancellationToken: cancellationToken);
    }

    public async Task<long?> SizeAsync(string path, CancellationToken cancellationToken)
    {
        var name = BlobName(path);

        if (name is null)
            return null;

        var container = await ContainerAsync(cancellationToken);

        try
        {
            var properties = await container.GetBlobClient(name).GetPropertiesAsync(cancellationToken: cancellationToken);

            return properties.Value.ContentLength;
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
    }

    // The stream can seek and knows its length, so songs are still served in packets (Range requests) from the container.
    public async Task<Stream?> OpenAsync(string path, CancellationToken cancellationToken)
    {
        var name = BlobName(path);

        if (name is null)
            return null;

        var container = await ContainerAsync(cancellationToken);

        try
        {
            return await container.GetBlobClient(name).OpenReadAsync(new BlobOpenReadOptions(false), cancellationToken);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
    }

    public async Task SaveAsync(string path, Stream content, CancellationToken cancellationToken)
    {
        var name = BlobName(path) ?? throw new InvalidOperationException("The file path is not a valid storage path.");
        var contentType = ContentTypes.TryGetContentType(name, out var type) ? type : "application/octet-stream";
        var container = await ContainerAsync(cancellationToken);
        await container.GetBlobClient(name).UploadAsync(content, new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } }, cancellationToken);
    }

    // Lists only the blobs under "<environment>/<folder>/"; a name with another "/" is in a subfolder and is left out.
    public async Task<List<string>> ListFolderAsync(string folder, CancellationToken cancellationToken)
    {
        var prefix = BlobName(folder);

        if (prefix is null)
            return [];

        var container = await ContainerAsync(cancellationToken);
        var names = new List<string>();

        await foreach (var blob in container.GetBlobsAsync(BlobTraits.None, BlobStates.None, prefix + "/", cancellationToken))
        {
            var name = blob.Name[(prefix.Length + 1)..];

            if (!name.Contains('/'))
                names.Add(name);
        }

        return names;
    }

    #endregion

    #region Private Methods

    private string? ConnectionString()
    {
        var value = _configuration[_options.ConnectionStringName] ?? _configuration.GetConnectionString(_options.ConnectionStringName);

        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private string? BlobName(string path)
    {
        var relative = StorageRules.CleanPath(path);

        return relative is null ? null : _prefix + relative;
    }

    private async Task<BlobContainerClient> ContainerAsync(CancellationToken cancellationToken)
    {
        if (_container is not null)
            return _container;

        await _gate.WaitAsync(cancellationToken);

        try
        {
            if (_container is not null)
                return _container;

            var connectionString = ConnectionString() ?? throw new BusinessException(MessageCodes.StorageNotConfigured, 503);
            var options = new BlobClientOptions();
            options.Retry.MaxRetries = _options.MaxRetries;
            options.Retry.Mode = RetryMode.Exponential;
            options.Retry.NetworkTimeout = TimeSpan.FromSeconds(_options.NetworkTimeoutSeconds);
            var container = new BlobServiceClient(connectionString, options).GetBlobContainerClient(_options.ContainerName);
            await container.CreateIfNotExistsAsync(cancellationToken: cancellationToken);
            _container = container;

            return container;
        }
        catch (Exception ex) when (ex is FormatException or ArgumentException or RequestFailedException)
        {
            _logger.LogWarning(ex, "The storage container {Container} could not be opened", _options.ContainerName);

            throw new BusinessException(MessageCodes.StorageUnreachable, 503);
        }
        finally
        {
            _gate.Release();
        }
    }

    #endregion
}
