using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IKhataContactRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task<int> CountContactsAsync(int bookId, CancellationToken cancellationToken);

    Task AddContactAsync(KhataContact contact, CancellationToken cancellationToken);

    Task<DateOnly?> GetLastEntryOnAsync(int contactId, CancellationToken cancellationToken);

    Task AddNotificationPrefAsync(KhataNotificationPref pref, CancellationToken cancellationToken);

    Task<KhataStoredFile?> GetStoredFileAsync(int storedFileId, CancellationToken cancellationToken);

    Task<(int ToGet, int ToGive)> CountBalancesAsync(int bookId, CancellationToken cancellationToken);

    Task<KhataContact?> GetContactAsync(int contactId, int userId, CancellationToken cancellationToken);

    Task SetPhotoAsync(KhataContact contact, KhataStoredFile storedFile, CancellationToken cancellationToken);

    Task<KhataNotificationPref?> GetNotificationPrefAsync(int contactId, CancellationToken cancellationToken);

    Task<KhataContact?> GetReadableContactAsync(int contactId, int userId, CancellationToken cancellationToken);

    Task<List<KhataNotificationPref>> GetNotificationPrefsAsync(int bookId, CancellationToken cancellationToken);

    Task<bool> UpdateContactAsync(KhataContact contact, byte[] expectedRowVersion, CancellationToken cancellationToken);

    Task<List<(KhataContact Contact, DateOnly? LastEntryOn)>> GetTopContactsAsync(int bookId, int count, CancellationToken cancellationToken);

    Task<List<(KhataContact Contact, DateOnly? LastEntryOn)>> GetContactsAsync(int bookId, bool includeDeleted, CancellationToken cancellationToken);
}
