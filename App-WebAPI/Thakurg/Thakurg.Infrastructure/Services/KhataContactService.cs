using Microsoft.Extensions.Options;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;
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

    // The contact's entries stay (soft delete), so the history is not lost.
    public async Task<string> DeleteAsync(KhataCallerDto caller, int contactId, CancellationToken cancellationToken)
    {
        var contact = await RequireContactAsync(caller, contactId, cancellationToken);

        contact.IsSoftDeleted = true;
        contact.ModifiedOn = DateTime.UtcNow;
        await _contactRepository.SaveChangesAsync(cancellationToken);
        await _common.Audit.WriteAsync(KhataAuditActions.ContactDeleted, caller.UserId, caller, new { ContactId = contactId, contact.BookId }, cancellationToken);

        return await _common.Messages.GetAsync(MessageCodes.KhataContactDeleted);
    }

    public async Task<BookContactsDto> GetByBookAsync(KhataCallerDto caller, int bookId, CancellationToken cancellationToken)
    {
        var books = await _bookRepository.GetBookSummariesAsync(caller.UserId, bookId, null, cancellationToken);
        var book = books.FirstOrDefault() ?? throw new BusinessException(MessageCodes.KhataBookNotFound, 404);
        var contacts = await _contactRepository.GetContactsAsync(bookId, cancellationToken);
        var prefs = (await _contactRepository.GetNotificationPrefsAsync(bookId, cancellationToken)).ToDictionary(p => p.ContactId);

        return new BookContactsDto { Book = book, Contacts = contacts.Select(c => KhataMapper.ToDto(c.Contact, c.LastEntryOn, prefs.GetValueOrDefault(c.Contact.Id))).ToList() };
    }

    public async Task<ContactNotifyDto> GetNotificationsAsync(KhataCallerDto caller, int contactId, CancellationToken cancellationToken)
    {
        await RequireContactAsync(caller, contactId, cancellationToken);

        return KhataMapper.ToDto(await _contactRepository.GetNotificationPrefAsync(contactId, cancellationToken));
    }

    public async Task<ContactDto> UpdateAsync(KhataCallerDto caller, int contactId, ContactRequestDto request, CancellationToken cancellationToken)
    {
        var contact = await RequireContactAsync(caller, contactId, cancellationToken);
        Apply(contact, request);
        contact.ModifiedOn = DateTime.UtcNow;
        if (!await _contactRepository.UpdateContactAsync(contact, KhataMapper.RowVersion(request.RowVersion), cancellationToken))
            throw new BusinessException(MessageCodes.KhataChangedElsewhere, 409);

        return KhataMapper.ToDto(contact, null, await _contactRepository.GetNotificationPrefAsync(contactId, cancellationToken));
    }

    public async Task<ContactDto> SetPermissionAsync(KhataCallerDto caller, int contactId, ContactPermissionRequestDto request, CancellationToken cancellationToken)
    {
        var contact = await RequireContactAsync(caller, contactId, cancellationToken);
        if (request.AllowContactEntries != contact.AllowContactEntries)
        {
            contact.AllowContactEntries = request.AllowContactEntries;
            contact.ModifiedOn = DateTime.UtcNow;
            await _contactRepository.SaveChangesAsync(cancellationToken);
            await _common.Audit.WriteAsync(request.AllowContactEntries ? KhataAuditActions.AllowEntriesOn : KhataAuditActions.AllowEntriesOff, caller.UserId, caller, new { ContactId = contactId }, cancellationToken);
        }

        return KhataMapper.ToDto(contact, null, await _contactRepository.GetNotificationPrefAsync(contactId, cancellationToken));
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

            return KhataMapper.ToDto(contact, null, null);
        }, cancellationToken);
    }

    // E-mail messages need the party's e-mail address and SMS their mobile number. Who changed the choice and when is kept (consent) and audited.
    public async Task<ServiceResultDto<ContactNotifyDto>> SetNotificationsAsync(KhataCallerDto caller, int contactId, ContactNotifyDto request, CancellationToken cancellationToken)
    {
        var contact = await RequireContactAsync(caller, contactId, cancellationToken);

        if (request.Email && contact.Email is null)
            throw new BusinessException(MessageCodes.KhataNotifyEmailMissing, 400);

        if (request.Sms && contact.Mobile is null)
            throw new BusinessException(MessageCodes.KhataNotifyMobileMissing, 400);

        var now = DateTime.UtcNow;
        var pref = await _contactRepository.GetNotificationPrefAsync(contactId, cancellationToken) ?? new KhataNotificationPref { ContactId = contactId };
        pref.NotifyPush = request.App;
        pref.NotifySms = request.Sms;
        pref.NotifyEmail = request.Email;
        pref.ConsentChangedByUserId = caller.UserId;
        pref.ConsentChangedOn = now;

        if (pref.Id == 0)
        {
            await _contactRepository.AddNotificationPrefAsync(pref, cancellationToken);
        }
        else
        {
            pref.ModifiedOn = now;
            await _contactRepository.SaveChangesAsync(cancellationToken);
        }

        await _common.Audit.WriteAsync(KhataAuditActions.NotifyChanged, caller.UserId, caller, new { ContactId = contactId, request.App, request.Sms, request.Email }, cancellationToken);

        return new ServiceResultDto<ContactNotifyDto> { Data = KhataMapper.ToDto(pref), Message = await _common.Messages.GetAsync(MessageCodes.KhataNotifySaved) };
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
