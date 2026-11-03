using Azure.Core;
using Azure.Storage.Blobs;
using Thakurg.Contracts.Khata;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Common;

// Azure Blob storage is used for new photos only when it is chosen, switched on and has a container and a stored connection string.
public static class KhataStorageRules
{
    private const int MaxRetries = 2;

    private static readonly TimeSpan NetworkTimeout = TimeSpan.FromSeconds(30);

    #region Public Methods

    public static bool IsAzureActive(KhataStorageSetting? setting)
    {
        return setting is { Enabled: true, Provider: (byte)KhataStorageProvider.AzureBlob, SecretProtected.Length: > 0, ContainerName.Length: > 0 };
    }

    public static string ProviderName(KhataStorageSetting? setting)
    {
        return setting?.Provider == (byte)KhataStorageProvider.AzureBlob ? KhataStorageProviders.Azure : KhataStorageProviders.Local;
    }

    public static BlobContainerClient Container(string connectionString, string containerName)
    {
        var options = new BlobClientOptions();
        options.Retry.MaxRetries = MaxRetries;
        options.Retry.Mode = RetryMode.Exponential;
        options.Retry.NetworkTimeout = NetworkTimeout;

        return new BlobServiceClient(connectionString, options).GetBlobContainerClient(containerName);
    }

    #endregion
}
