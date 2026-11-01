using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class KhataContactRepository : IKhataContactRepository
{
    private readonly ICommonDbContext _dbContext;

    public KhataContactRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<int> CountContactsAsync(int bookId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataContacts.WhereActive().CountAsync(c => c.BookId == bookId, cancellationToken);
    }

    public async Task AddContactAsync(KhataContact contact, CancellationToken cancellationToken)
    {
        _dbContext.KhataContacts.Add(contact);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    // Only the owner's contacts, and only while the book itself is not deleted.
    public Task<KhataContact?> GetContactAsync(int contactId, int userId, CancellationToken cancellationToken)
    {
        var books = _dbContext.KhataBooks.WhereActive();

        return _dbContext.KhataContacts.WhereActive().FirstOrDefaultAsync(c => c.Id == contactId && c.OwnerUserId == userId && books.Any(b => b.Id == c.BookId), cancellationToken);
    }

    // False when someone else changed the contact since the caller read it (RowVersion no longer matches).
    public async Task<bool> UpdateContactAsync(KhataContact contact, byte[] expectedRowVersion, CancellationToken cancellationToken)
    {
        _dbContext.Entry(contact).Property(c => c.RowVersion).OriginalValue = expectedRowVersion;

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);

            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            return false;
        }
    }

    public async Task<List<(KhataContact Contact, DateOnly? LastEntryOn)>> GetContactsAsync(int bookId, CancellationToken cancellationToken)
    {
        var rows = await _dbContext.KhataContacts.AsNoTracking().WhereActive().Where(c => c.BookId == bookId)
            .Select(c => new { Contact = c, LastEntryOn = _dbContext.KhataTransactions.Where(t => t.ContactId == c.Id && !t.IsDeleted && !t.IsSoftDeleted).Max(t => (DateOnly?)t.EntryDate) })
            .OrderByDescending(r => r.LastEntryOn).ThenBy(r => r.Contact.Name)
            .ToListAsync(cancellationToken);

        return rows.Select(r => (r.Contact, r.LastEntryOn)).ToList();
    }

    #endregion
}
