using System.Text.RegularExpressions;
using Azure.Storage.Blobs;
using Microsoft.Extensions.Logging;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// Site-wide choice of where SnapKhata keeps new bill photos (super admin, password session only): local files or an Azure Blob container.
// The connection string (or the account key, turned into one) is encrypted at rest and never returned.
public class KhataStorageService : IKhataStorageService
{
    private const int MaxSecretLength = 2000;

    private readonly IMessageService _messageService;

    private readonly IKhataSecretProtector _protector;

    private readonly ILogger<KhataStorageService> _logger;

    private const string EndpointSuffix = "core.windows.net";

    private readonly IKhataStorageRepository _storageRepository;

    private static readonly Regex AccountPattern = new("^[a-z0-9]{3,24}$", RegexOptions.Compiled);

    private static readonly Regex ContainerPattern = new("^(?=.{3,63}$)[a-z0-9]+(-[a-z0-9]+)*$", RegexOptions.Compiled);

    public KhataStorageService(IKhataStorageRepository storageRepository, IKhataSecretProtector protector, IMessageService messageService, ILogger<KhataStorageService> logger)
    {
        _storageRepository = storageRepository;
        _protector = protector;
        _messageService = messageService;
        _logger = logger;
    }

    #region Public Methods

    // Reaches the stored container with the stored connection string.
    public async Task<string> TestAsync(CancellationToken cancellationToken)
    {
        var setting = await _storageRepository.GetAsync(cancellationToken);

        if (setting?.SecretProtected is null || setting.ContainerName is null)
            throw new BusinessException(MessageCodes.KhataStorageUnreachable, 400);

        bool exists;

        try
        {
            var container = KhataStorageRules.Container(_protector.Unprotect(setting.SecretProtected), setting.ContainerName);
            exists = await container.ExistsAsync(cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "The Khata storage container {Container} could not be reached", setting.ContainerName);
            exists = false;
        }

        return exists ? await _messageService.GetAsync(MessageCodes.KhataStorageReachable) : throw new BusinessException(MessageCodes.KhataStorageUnreachable, 400);
    }

    public async Task<KhataStorageDto> GetAsync(CancellationToken cancellationToken)
    {
        return ToDto(await _storageRepository.GetAsync(cancellationToken));
    }

    // Azure switched on needs a container and a connection string (sent now or stored before). A blank connection string keeps the stored one.
    public async Task<ServiceResultDto<KhataStorageDto>> SaveAsync(int accountUserId, KhataStorageRequestDto request, CancellationToken cancellationToken)
    {
        var provider = (request.Provider ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            KhataStorageProviders.Local => KhataStorageProvider.Local,
            KhataStorageProviders.Azure => KhataStorageProvider.AzureBlob,
            _ => throw Invalid()
        };
        var accountName = Optional(request.AccountName);
        var containerName = Optional(request.ContainerName);
        var secret = (request.ConnectionString ?? string.Empty).Trim();

        if ((accountName is not null && !AccountPattern.IsMatch(accountName)) || (containerName is not null && !ContainerPattern.IsMatch(containerName)) || secret.Length > MaxSecretLength)
            throw Invalid();

        var setting = await _storageRepository.GetAsync(cancellationToken) ?? new KhataStorageSetting { CreatedBy = accountUserId };

        if (secret.Length > 0)
        {
            var connectionString = ConnectionString(secret, accountName) ?? throw Invalid();
            accountName = new BlobServiceClient(connectionString).AccountName;
            setting.SecretProtected = _protector.Protect(connectionString);
        }

        if (provider == KhataStorageProvider.AzureBlob && request.Enabled && (containerName is null || setting.SecretProtected is null))
            throw Invalid();

        setting.Provider = (byte)provider;
        setting.Enabled = request.Enabled;
        setting.AccountName = accountName;
        setting.ContainerName = containerName;
        await SaveAsync(setting, accountUserId, cancellationToken);

        return new ServiceResultDto<KhataStorageDto> { Data = ToDto(setting), Message = await _messageService.GetAsync(MessageCodes.KhataStorageSaved) };
    }

    #endregion

    #region Private Methods

    private static BusinessException Invalid()
    {
        return new BusinessException(MessageCodes.KhataStorageInvalid, 400);
    }

    private static string? Optional(string? value)
    {
        var text = value?.Trim().ToLowerInvariant();

        return string.IsNullOrEmpty(text) ? null : text;
    }

    private static KhataStorageDto ToDto(KhataStorageSetting? setting)
    {
        return new KhataStorageDto { Provider = KhataStorageRules.ProviderName(setting), Enabled = setting?.Enabled ?? false, AccountName = setting?.AccountName, ContainerName = setting?.ContainerName, HasKey = setting?.SecretProtected is not null };
    }

    // A full connection string is checked by parsing it; anything else is taken as the account key of AccountName.
    private static string? ConnectionString(string secret, string? accountName)
    {
        var connectionString = secret.Contains('=') && secret.Contains(';') ? secret : accountName is not null && Convert.TryFromBase64String(secret, new byte[secret.Length], out _) ? $"DefaultEndpointsProtocol=https;AccountName={accountName};AccountKey={secret};EndpointSuffix={EndpointSuffix}" : null;

        try
        {
            return connectionString is null ? null : new BlobServiceClient(connectionString).AccountName is { Length: > 0 } ? connectionString : null;
        }
        catch (Exception ex) when (ex is FormatException or ArgumentException or InvalidOperationException)
        {
            return null;
        }
    }

    private async Task SaveAsync(KhataStorageSetting setting, int accountUserId, CancellationToken cancellationToken)
    {
        if (setting.Id == 0)
        {
            await _storageRepository.AddAsync(setting, cancellationToken);
            return;
        }

        setting.ModifiedBy = accountUserId;
        setting.ModifiedOn = DateTime.UtcNow;
        await _storageRepository.SaveChangesAsync(cancellationToken);
    }

    #endregion
}
