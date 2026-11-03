namespace Thakurg.Contracts.Configurations;

// Khata:Storage: Azure Blob client retries and timeout, the folder photos go in, the longest connection string accepted, and the endpoint suffix used when only an account key is given.
public class KhataStorageOptions
{
    public int MaxRetries { get; set; }

    public int SecretLength { get; set; }

    public int NetworkTimeoutSeconds { get; set; }

    public string BlobFolder { get; set; } = string.Empty;

    public string EndpointSuffix { get; set; } = string.Empty;
}
