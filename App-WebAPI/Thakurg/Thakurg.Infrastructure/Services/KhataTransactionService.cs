using System.Text.Json;
using Microsoft.Extensions.Options;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// Ledger entries. Every change keeps a version in KhataTransactionHistory, moves the contact balance in the same SQL transaction,
// and an edit or delete needs a fresh PIN proof for that one entry (Q4: always editable by whoever added it).
public class KhataTransactionService : IKhataTransactionService
{
    private const int MaxNoteLength = 500;

    private readonly KhataLimitsOptions _limits;

    private readonly IKhataCommonServices _common;

    private readonly IKhataContactRepository _contactRepository;

    private readonly IKhataTransactionRepository _transactionRepository;

    private static readonly DateOnly FirstAllowedDate = new(2000, 1, 1);

    public KhataTransactionService(IOptions<KhataOptions> options, IKhataCommonServices common, IKhataContactRepository contactRepository, IKhataTransactionRepository transactionRepository)
    {
        _limits = options.Value.Limits;
        _common = common;
        _contactRepository = contactRepository;
        _transactionRepository = transactionRepository;
    }

    #region Public Methods

    public async Task<string> DeleteAsync(KhataCallerDto caller, int transactionId, string? proof, CancellationToken cancellationToken)
    {
        var entry = await RequireOwnEntryAsync(caller, transactionId, cancellationToken);
        await _common.Pin.ConsumeProofAsync(caller, KhataPinPurpose.DeleteTransaction, transactionId, proof, cancellationToken);

        var rowVersion = entry.RowVersion;
        var balanceDelta = -KhataMapper.Signed(entry.EntryType, entry.AmountMinor);
        entry.IsSoftDeleted = true;
        await SaveChangeAsync(caller, entry, rowVersion, KhataChangeType.Deleted, balanceDelta, cancellationToken);
        await _common.Audit.WriteAsync(KhataAuditActions.EntryDeleted, caller.UserId, caller, new { TransactionId = transactionId, entry.Version }, cancellationToken);

        return await _common.Messages.GetAsync(MessageCodes.KhataEntryDeleted);
    }

    public async Task<List<TransactionHistoryDto>> GetHistoryAsync(KhataCallerDto caller, int transactionId, CancellationToken cancellationToken)
    {
        await RequireVisibleEntryAsync(caller, transactionId, cancellationToken);
        var history = await _transactionRepository.GetHistoryAsync(transactionId, cancellationToken);

        return history.Select(KhataMapper.ToDto).ToList();
    }

    public async Task<TransactionPageDto> GetPageAsync(KhataCallerDto caller, int contactId, int page, int? pageSize, CancellationToken cancellationToken)
    {
        var contact = await RequireContactAsync(caller, contactId, cancellationToken);
        var size = Math.Clamp(pageSize ?? _limits.PageSize, 1, _limits.MaxPageSize);
        var number = Math.Max(1, page);
        var (items, total) = await _transactionRepository.GetPageAsync(contactId, number, size, cancellationToken);

        return new TransactionPageDto { Items = items.Select(t => KhataMapper.ToDto(t, caller.UserId)).ToList(), Page = number, PageSize = size, Total = total, BalanceMinor = contact.BalanceMinor };
    }

    public async Task<TransactionDto> UpdateAsync(KhataCallerDto caller, int transactionId, TransactionRequestDto request, string? proof, CancellationToken cancellationToken)
    {
        Validate(request);
        var entry = await RequireOwnEntryAsync(caller, transactionId, cancellationToken);
        await _common.Pin.ConsumeProofAsync(caller, KhataPinPurpose.EditTransaction, transactionId, proof, cancellationToken);

        var balanceDelta = KhataMapper.Signed((byte)request.EntryType, request.AmountMinor) - KhataMapper.Signed(entry.EntryType, entry.AmountMinor);
        entry.EntryType = (byte)request.EntryType;
        entry.AmountMinor = request.AmountMinor;
        entry.Note = Note(request.Note);
        entry.EntryDate = request.EntryDate;
        await SaveChangeAsync(caller, entry, KhataMapper.RowVersion(request.RowVersion), KhataChangeType.Edited, balanceDelta, cancellationToken);
        await _common.Audit.WriteAsync(KhataAuditActions.EntryEdited, caller.UserId, caller, new { TransactionId = transactionId, entry.Version }, cancellationToken);

        return KhataMapper.ToDto(entry, caller.UserId);
    }

    public async Task<TransactionDto> AddAsync(KhataCallerDto caller, int contactId, TransactionRequestDto request, Guid? idempotencyKey, CancellationToken cancellationToken)
    {
        return await _common.Idempotency.RunAsync(caller, idempotencyKey, "POST contacts/" + contactId + "/transactions", request, async () =>
        {
            Validate(request);
            var contact = await RequireContactAsync(caller, contactId, cancellationToken);
            var entry = new KhataTransaction { BookId = contact.BookId, ContactId = contactId, EntryType = (byte)request.EntryType, AmountMinor = request.AmountMinor, Note = Note(request.Note), EntryDate = request.EntryDate, AddedByUserId = caller.UserId, Version = 1, Source = (byte)KhataEntrySource.App };
            var history = NewHistory(caller, entry, KhataChangeType.Created);
            await _transactionRepository.AddAsync(entry, history, KhataMapper.Signed(entry.EntryType, entry.AmountMinor), cancellationToken);

            return KhataMapper.ToDto(entry, caller.UserId);
        }, cancellationToken);
    }

    #endregion

    #region Private Methods

    private static string? Note(string? note)
    {
        return string.IsNullOrWhiteSpace(note) ? null : note.Trim();
    }

    private void Validate(TransactionRequestDto request)
    {
        var latestAllowedDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1);
        var noteTooLong = request.Note is not null && request.Note.Trim().Length > MaxNoteLength;
        if (!Enum.IsDefined(request.EntryType) || request.AmountMinor <= 0 || request.AmountMinor > _limits.MaxAmountMinor || request.EntryDate < FirstAllowedDate || request.EntryDate > latestAllowedDate || noteTooLong)
            throw new BusinessException(MessageCodes.KhataEntryInvalid, 400);
    }

    private static KhataTransactionHistory NewHistory(KhataCallerDto caller, KhataTransaction entry, KhataChangeType changeType)
    {
        return new KhataTransactionHistory { TransactionId = entry.Id, Version = entry.Version, ChangeType = (byte)changeType, SnapshotJson = JsonSerializer.Serialize(KhataMapper.Snapshot(entry)), ChangedByUserId = caller.UserId };
    }

    private async Task<KhataContact> RequireContactAsync(KhataCallerDto caller, int contactId, CancellationToken cancellationToken)
    {
        return await _contactRepository.GetContactAsync(contactId, caller.UserId, cancellationToken) ?? throw new BusinessException(MessageCodes.KhataContactNotFound, 404);
    }

    // Only whoever added an entry may edit or delete it (design §5.5).
    private async Task<KhataTransaction> RequireOwnEntryAsync(KhataCallerDto caller, int transactionId, CancellationToken cancellationToken)
    {
        var entry = await RequireVisibleEntryAsync(caller, transactionId, cancellationToken);
        if (entry.AddedByUserId != caller.UserId)
            throw new BusinessException(MessageCodes.KhataEntryNotYours, 403);

        return entry;
    }

    // Visible = the entry belongs to one of the caller's own contacts.
    private async Task<KhataTransaction> RequireVisibleEntryAsync(KhataCallerDto caller, int transactionId, CancellationToken cancellationToken)
    {
        var entry = await _transactionRepository.GetTransactionAsync(transactionId, cancellationToken);
        if (entry is null || await _contactRepository.GetContactAsync(entry.ContactId, caller.UserId, cancellationToken) is null)
            throw new BusinessException(MessageCodes.KhataEntryNotFound, 404);

        return entry;
    }

    private async Task SaveChangeAsync(KhataCallerDto caller, KhataTransaction entry, byte[] expectedRowVersion, KhataChangeType changeType, long balanceDelta, CancellationToken cancellationToken)
    {
        entry.Version++;
        entry.ModifiedOn = DateTime.UtcNow;
        if (!await _transactionRepository.UpdateAsync(entry, expectedRowVersion, NewHistory(caller, entry, changeType), balanceDelta, cancellationToken))
            throw new BusinessException(MessageCodes.KhataChangedElsewhere, 409);
    }

    #endregion
}
