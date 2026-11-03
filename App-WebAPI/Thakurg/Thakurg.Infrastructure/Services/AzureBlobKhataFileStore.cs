using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Logging;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// Bill photos in the site's Azure Blob container (KhataStorageSettings) as khata/{userId}/{bookId}/{name}. Photos already there stay readable
// even after the site switches back to local files, as long as the connection string is kept.
public class AzureBlobKhataFileStore : IKhataFileStore
{
    private const string Folder = "khata";

    private BlobContainerClient? _container;

    private readonly IKhataSecretProtector _protector;

    private readonly ILogger<AzureBlobKhataFileStore> _logger;

    private readonly IKhataStorageRepository _storageRepository;

    public KhataStorageProvider Provider => KhataStorageProvider.AzureBlob;

    public AzureBlobKhataFileStore(IKhataStorageRepository storageRepository, IKhataSecretProtector protector, ILogger<AzureBlobKhataFileStore> logger)
    {
        _storageRepository = storageRepository;
        _protector = protector;
        _logger = logger;
    }

    #region Public Methods

    // The rows are already marked deleted, so a blob that cannot be removed now is only logged.
    public async Task DeleteAsync(string fileId, CancellationToken cancellationToken)
    {
        try
        {
            var container = await ContainerAsync(cancellationToken);
            await container.DeleteBlobIfExistsAsync(fileId, cancellationToken: cancellationToken);
        }
        catch (RequestFailedException ex)
        {
            _logger.LogWarning(ex, "Deleting the Khata blob {FileId} failed", fileId);
        }
    }

    public async Task<Stream?> OpenAsync(string fileId, CancellationToken cancellationToken)
    {
        try
        {
            var container = await ContainerAsync(cancellationToken);
            var download = await container.GetBlobClient(fileId).DownloadStreamingAsync(cancellationToken: cancellationToken);

            return download.Value.Content;
        }
        catch (RequestFailedException ex)
        {
            _logger.LogWarning(ex, "Reading the Khata blob {FileId} failed", fileId);

            return null;
        }
    }

    public async Task<string> SaveAsync(int userId, int bookId, string fileName, byte[] content, string contentType, CancellationToken cancellationToken)
    {
        var fileId = $"{Folder}/{userId}/{bookId}/{fileName}";
        var container = await ContainerAsync(cancellationToken);
        await container.GetBlobClient(fileId).UploadAsync(new BinaryData(content), new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } }, cancellationToken);

        return fileId;
    }

    #endregion

    #region Private Methods

    private async Task<BlobContainerClient> ContainerAsync(CancellationToken cancellationToken)
    {
        if (_container is not null)
            return _container;

        var setting = await _storageRepository.GetAsync(cancellationToken);

        if (setting?.SecretProtected is null || setting.ContainerName is null)
            throw new BusinessException(MessageCodes.KhataStorageUnreachable, 503);

        _container = KhataStorageRules.Container(_protector.Unprotect(setting.SecretProtected), setting.ContainerName);

        return _container;
    }

    #endregion
}
