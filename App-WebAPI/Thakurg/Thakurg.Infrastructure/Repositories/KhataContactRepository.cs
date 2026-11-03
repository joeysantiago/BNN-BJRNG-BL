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

    public Task<DateOnly?> GetLastEntryOnAsync(int contactId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataTransactions.Where(t => t.ContactId == contactId && t.IsActive && !t.IsDeleted && !t.IsSoftDeleted).MaxAsync(t => (DateOnly?)t.EntryDate, cancellationToken);
    }

    // Only the owner's contacts, and only while the book itself is not deleted.
    public Task<KhataContact?> GetContactAsync(int contactId, int userId, CancellationToken cancellationToken)
    {
        var books = _dbContext.KhataBooks.WhereActive();

        return _dbContext.KhataContacts.WhereActive().FirstOrDefaultAsync(c => c.Id == contactId && c.OwnerUserId == userId && books.Any(b => b.Id == c.BookId), cancellationToken);
    }

    public async Task AddNotificationPrefAsync(KhataNotificationPref pref, CancellationToken cancellationToken)
    {
        _dbContext.KhataNotificationPrefs.Add(pref);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    // Contacts of the book that you will get from (balance above 0) and that you will give to (below 0).
    public async Task<(int ToGet, int ToGive)> CountBalancesAsync(int bookId, CancellationToken cancellationToken)
    {
        var contacts = _dbContext.KhataContacts.WhereActive().Where(c => c.BookId == bookId);
        var toGet = await contacts.CountAsync(c => c.BalanceMinor > 0, cancellationToken);
        var toGive = await contacts.CountAsync(c => c.BalanceMinor < 0, cancellationToken);

        return (toGet, toGive);
    }

    public Task<KhataNotificationPref?> GetNotificationPrefAsync(int contactId, CancellationToken cancellationToken)
    {
        return _dbContext.KhataNotificationPrefs.WhereActive().FirstOrDefaultAsync(p => p.ContactId == contactId, cancellationToken);
    }

    // The notification choices of the book's contacts (contacts without a row have every channel off).
    public Task<List<KhataNotificationPref>> GetNotificationPrefsAsync(int bookId, CancellationToken cancellationToken)
    {
        var contacts = _dbContext.KhataContacts.Where(c => c.BookId == bookId);

        return _dbContext.KhataNotificationPrefs.AsNoTracking().WhereActive().Where(p => contacts.Any(c => c.Id == p.ContactId)).ToListAsync(cancellationToken);
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

    // The contacts with the largest open balance either way; settled contacts (balance 0) are left out.
    public async Task<List<(KhataContact Contact, DateOnly? LastEntryOn)>> GetTopContactsAsync(int bookId, int count, CancellationToken cancellationToken)
    {
        var rows = await _dbContext.KhataContacts.AsNoTracking().WhereActive().Where(c => c.BookId == bookId && c.BalanceMinor != 0)
            .OrderByDescending(c => Math.Abs(c.BalanceMinor)).ThenBy(c => c.Name).Take(count)
            .Select(c => new { Contact = c, LastEntryOn = _dbContext.KhataTransactions.Where(t => t.ContactId == c.Id && !t.IsDeleted && !t.IsSoftDeleted).Max(t => (DateOnly?)t.EntryDate) })
            .ToListAsync(cancellationToken);

        return rows.Select(r => (r.Contact, r.LastEntryOn)).ToList();
    }

    #endregion
}
