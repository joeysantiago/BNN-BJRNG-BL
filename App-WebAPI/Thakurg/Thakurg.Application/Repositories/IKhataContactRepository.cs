using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IKhataContactRepository
{
    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task<int> CountContactsAsync(int bookId, CancellationToken cancellationToken);

    Task AddContactAsync(KhataContact contact, CancellationToken cancellationToken);

    Task<KhataContact?> GetContactAsync(int contactId, int userId, CancellationToken cancellationToken);

    Task<bool> UpdateContactAsync(KhataContact contact, byte[] expectedRowVersion, CancellationToken cancellationToken);

    Task<List<(KhataContact Contact, DateOnly? LastEntryOn)>> GetContactsAsync(int bookId, CancellationToken cancellationToken);
}
