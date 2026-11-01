using System.Text.Json;
using Thakurg.Contracts.Khata;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Common;

// Entity to DTO mapping for the SnapKhata ledger services, plus the sign of an amount: "gave" raises the balance (you will get), "got" lowers it.
public static class KhataMapper
{
    #region Public Methods

    // A missing or malformed row version never matches, so the save is refused as "changed by someone else".
    public static byte[] RowVersion(string? value)
    {
        var buffer = new byte[8];

        return Convert.TryFromBase64String(value ?? string.Empty, buffer, out var written) && written == buffer.Length ? buffer : [];
    }

    public static CurrencyDto ToDto(KhataCurrency currency)
    {
        return new CurrencyDto { Id = currency.Id, Code = currency.Code, Symbol = currency.Symbol, Name = currency.Name, Decimals = currency.Decimals, IsIso = currency.IsIso, IsCustom = currency.OwnerUserId is not null };
    }

    public static long Signed(byte entryType, long amountMinor)
    {
        return entryType == (byte)KhataEntryType.Gave ? amountMinor : -amountMinor;
    }

    public static TransactionSnapshotDto Snapshot(KhataTransaction entry)
    {
        return new TransactionSnapshotDto { EntryType = (KhataEntryType)entry.EntryType, AmountMinor = entry.AmountMinor, Note = entry.Note, EntryDate = entry.EntryDate };
    }

    public static TransactionDto ToDto(KhataTransaction entry, int userId)
    {
        return new TransactionDto { Id = entry.Id, ContactId = entry.ContactId, EntryType = (KhataEntryType)entry.EntryType, AmountMinor = entry.AmountMinor, Note = entry.Note, EntryDate = entry.EntryDate, AddedByUserId = entry.AddedByUserId, AddedByMe = entry.AddedByUserId == userId, Version = entry.Version, IsDeleted = entry.IsSoftDeleted, CreatedOn = entry.CreatedOn, ModifiedOn = entry.ModifiedOn, RowVersion = Convert.ToBase64String(entry.RowVersion) };
    }

    public static TransactionHistoryDto ToDto(KhataTransactionHistory history)
    {
        return new TransactionHistoryDto { Version = history.Version, ChangeType = (KhataChangeType)history.ChangeType, Snapshot = JsonSerializer.Deserialize<TransactionSnapshotDto>(history.SnapshotJson) ?? new(), ChangedByUserId = history.ChangedByUserId, ChangedOn = history.CreatedOn };
    }

    public static ContactDto ToDto(KhataContact contact, DateOnly? lastEntryOn)
    {
        return new ContactDto { Id = contact.Id, BookId = contact.BookId, Name = contact.Name, Mobile = contact.Mobile, Email = contact.Email, Address = contact.Address, Note = contact.Note, ContactType = (KhataContactType)contact.ContactType, AllowContactEntries = contact.AllowContactEntries, ShareStatus = (KhataShareStatus)contact.ShareStatus, BalanceMinor = contact.BalanceMinor, DueDate = contact.DueDate, LastEntryOn = lastEntryOn, RowVersion = Convert.ToBase64String(contact.RowVersion) };
    }

    #endregion
}
