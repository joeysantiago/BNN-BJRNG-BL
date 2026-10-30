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

// Contacts (customers and suppliers) of one book. The balance is never set here: only entries change it (design S3).
public class KhataContactService : IKhataContactService
{
    private const int MaxNameLength = 100;

    private const int MaxNoteLength = 500;

    private const int MaxAddressLength = 300;

    private readonly KhataLimitsOptions _limits;

    private readonly IKhataCommonServices _common;

    private readonly IKhataBookRepository _bookRepository;

    private readonly IKhataContactRepository _contactRepository;

    public KhataContactService(IOptions<KhataOptions> options, IKhataCommonServices common, IKhataBookRepository bookRepository, IKhataContactRepository contactRepository)
    {
        _limits = options.Value.Limits;
        _common = common;
        _bookRepository = bookRepository;
        _contactRepository = contactRepository;
    }

    #region Public Methods

    public async Task<BookContactsDto> GetByBookAsync(KhataCallerDto caller, int bookId, CancellationToken cancellationToken)
    {
        var books = await _bookRepository.GetBookSummariesAsync(caller.UserId, bookId, null, cancellationToken);
        var book = books.FirstOrDefault() ?? throw new BusinessException(MessageCodes.KhataBookNotFound, 404);
        var contacts = await _contactRepository.GetContactsAsync(bookId, cancellationToken);

        return new BookContactsDto { Book = book, Contacts = contacts.Select(c => KhataMapper.ToDto(c.Contact, c.LastEntryOn)).ToList() };
    }

    // The contact's entries stay (soft delete), so the history is not lost.
    public async Task<string> DeleteAsync(KhataCallerDto caller, int contactId, string? proof, CancellationToken cancellationToken)
    {
        var contact = await RequireContactAsync(caller, contactId, cancellationToken);
        await _common.Pin.ConsumeProofAsync(caller, KhataPinPurpose.DeleteContact, contactId, proof, cancellationToken);

        contact.IsSoftDeleted = true;
        contact.ModifiedOn = DateTime.UtcNow;
        await _contactRepository.SaveChangesAsync(cancellationToken);
        await _common.Audit.WriteAsync(KhataAuditActions.ContactDeleted, caller.UserId, caller, new { ContactId = contactId, contact.BookId }, cancellationToken);

        return await _common.Messages.GetAsync(MessageCodes.KhataContactDeleted);
    }

    public async Task<ContactDto> UpdateAsync(KhataCallerDto caller, int contactId, ContactRequestDto request, CancellationToken cancellationToken)
    {
        var contact = await RequireContactAsync(caller, contactId, cancellationToken);
        Apply(contact, request);
        contact.ModifiedOn = DateTime.UtcNow;
        if (!await _contactRepository.UpdateContactAsync(contact, KhataMapper.RowVersion(request.RowVersion), cancellationToken))
            throw new BusinessException(MessageCodes.KhataChangedElsewhere, 409);

        return KhataMapper.ToDto(contact, null);
    }

    public async Task<ContactDto> CreateAsync(KhataCallerDto caller, int bookId, ContactRequestDto request, Guid? idempotencyKey, CancellationToken cancellationToken)
    {
        return await _common.Idempotency.RunAsync(caller, idempotencyKey, "POST books/" + bookId + "/contacts", request, async () =>
        {
            if (await _bookRepository.GetBookAsync(bookId, caller.UserId, cancellationToken) is null)
                throw new BusinessException(MessageCodes.KhataBookNotFound, 404);

            if (await _contactRepository.CountContactsAsync(bookId, cancellationToken) >= _limits.MaxContactsPerBook)
                throw new BusinessException(MessageCodes.KhataContactLimit, 409, _limits.MaxContactsPerBook);

            var contact = new KhataContact { BookId = bookId, OwnerUserId = caller.UserId, ShareStatus = (byte)KhataShareStatus.NotOnApp };
            Apply(contact, request);
            await _contactRepository.AddContactAsync(contact, cancellationToken);

            return KhataMapper.ToDto(contact, null);
        }, cancellationToken);
    }

    // Letting a contact add entries needs a PIN proof; taking that right away again does not.
    public async Task<ContactDto> SetPermissionAsync(KhataCallerDto caller, int contactId, ContactPermissionRequestDto request, string? proof, CancellationToken cancellationToken)
    {
        var contact = await RequireContactAsync(caller, contactId, cancellationToken);
        if (request.AllowContactEntries && !contact.AllowContactEntries)
            await _common.Pin.ConsumeProofAsync(caller, KhataPinPurpose.AllowContactEntries, contactId, proof, cancellationToken);

        if (request.AllowContactEntries != contact.AllowContactEntries)
        {
            contact.AllowContactEntries = request.AllowContactEntries;
            contact.ModifiedOn = DateTime.UtcNow;
            await _contactRepository.SaveChangesAsync(cancellationToken);
            await _common.Audit.WriteAsync(request.AllowContactEntries ? KhataAuditActions.AllowEntriesOn : KhataAuditActions.AllowEntriesOff, caller.UserId, caller, new { ContactId = contactId }, cancellationToken);
        }

        return KhataMapper.ToDto(contact, null);
    }

    #endregion

    #region Private Methods

    private static string? Optional(string? value, int maxLength)
    {
        var text = value?.Trim();
        if (text is { Length: > 0 } && text.Length > maxLength)
            throw new BusinessException(MessageCodes.KhataContactInvalid, 400);

        return string.IsNullOrEmpty(text) ? null : text;
    }

    // An empty mobile or email is allowed; a filled one must be valid (same rules as login, so the contact can be linked when they log in).
    private static void Apply(KhataContact contact, ContactRequestDto request)
    {
        var name = request.Name.Trim();
        var mobile = string.IsNullOrWhiteSpace(request.Mobile) ? null : KhataIdentifier.Mobile(request.Mobile);
        var email = string.IsNullOrWhiteSpace(request.Email) ? null : KhataIdentifier.Email(request.Email);
        var invalidMobile = !string.IsNullOrWhiteSpace(request.Mobile) && mobile is null;
        var invalidEmail = !string.IsNullOrWhiteSpace(request.Email) && email is null;
        if (name.Length is 0 or > MaxNameLength || invalidMobile || invalidEmail || !Enum.IsDefined(request.ContactType))
            throw new BusinessException(MessageCodes.KhataContactInvalid, 400);

        contact.Name = name;
        contact.Mobile = mobile;
        contact.Email = email;
        contact.Address = Optional(request.Address, MaxAddressLength);
        contact.Note = Optional(request.Note, MaxNoteLength);
        contact.ContactType = (byte)request.ContactType;
    }

    private async Task<KhataContact> RequireContactAsync(KhataCallerDto caller, int contactId, CancellationToken cancellationToken)
    {
        return await _contactRepository.GetContactAsync(contactId, caller.UserId, cancellationToken) ?? throw new BusinessException(MessageCodes.KhataContactNotFound, 404);
    }

    #endregion
}
