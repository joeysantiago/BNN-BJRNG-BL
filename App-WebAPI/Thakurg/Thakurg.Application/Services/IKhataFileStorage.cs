using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

// Picks the file store: new photos go to the site's chosen store (KhataStorageSettings), existing ones are read and deleted where their row says they are.
public interface IKhataFileStorage
{
    IKhataFileStore? Get(KhataStorageProvider provider);

    Task<IKhataFileStore> GetUploadStoreAsync(CancellationToken cancellationToken);
}
