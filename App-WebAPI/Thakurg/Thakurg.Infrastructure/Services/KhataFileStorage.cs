using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Khata;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// New photos go to Azure Blob when the site switched it on (KhataStorageSettings), else to local files; a stored photo is read and deleted where its row says.
public class KhataFileStorage : IKhataFileStorage
{
    private readonly IEnumerable<IKhataFileStore> _stores;

    private readonly IKhataStorageRepository _storageRepository;

    public KhataFileStorage(IEnumerable<IKhataFileStore> stores, IKhataStorageRepository storageRepository)
    {
        _stores = stores;
        _storageRepository = storageRepository;
    }

    #region Public Methods

    public IKhataFileStore? Get(KhataStorageProvider provider)
    {
        return _stores.FirstOrDefault(s => s.Provider == provider);
    }

    public async Task<IKhataFileStore> GetUploadStoreAsync(CancellationToken cancellationToken)
    {
        var setting = await _storageRepository.GetAsync(cancellationToken);
        var provider = KhataStorageRules.IsAzureActive(setting) ? KhataStorageProvider.AzureBlob : KhataStorageProvider.Local;

        return Get(provider) ?? throw new InvalidOperationException($"No Khata file store is registered for {provider}.");
    }

    #endregion
}
