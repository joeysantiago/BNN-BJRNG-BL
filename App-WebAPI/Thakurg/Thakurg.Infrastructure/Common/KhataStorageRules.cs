using Azure.Core;
using Azure.Storage.Blobs;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Khata;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Common;

// Azure Blob storage is used for new photos only when it is chosen, switched on and has a container and a stored connection string.
public static class KhataStorageRules
{
    #region Public Methods

    public static bool IsAzureActive(KhataStorageSetting? setting)
    {
        return setting is { Enabled: true, Provider: (byte)KhataStorageProvider.AzureBlob, SecretProtected.Length: > 0, ContainerName.Length: > 0 };
    }

    public static string ProviderName(KhataStorageSetting? setting)
    {
        return setting?.Provider == (byte)KhataStorageProvider.AzureBlob ? KhataStorageProviders.Azure : KhataStorageProviders.Local;
    }

    // Retries and timeout come from Khata:Storage.
    public static BlobContainerClient Container(string connectionString, string containerName, KhataStorageOptions storage)
    {
        var options = new BlobClientOptions();
        options.Retry.MaxRetries = storage.MaxRetries;
        options.Retry.Mode = RetryMode.Exponential;
        options.Retry.NetworkTimeout = TimeSpan.FromSeconds(storage.NetworkTimeoutSeconds);

        return new BlobServiceClient(connectionString, options).GetBlobContainerClient(containerName);
    }

    #endregion
}
