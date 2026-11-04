using Microsoft.Extensions.Options;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Abstractions;
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
    private readonly KhataLimitsOptions _limits;

    private readonly IKhataCommonServices _common;

    private readonly IKhataFileStorage _fileStorage;

    private readonly IKhataBookRepository _bookRepository;

    private readonly IKhataContactRepository _contactRepository;

    public KhataContactService(IOptions<KhataOptions> options, IKhataCommonServices common, IKhataBookRepository bookRepository, IKhataContactRepository contactRepository, IKhataFileStorage fileStorage)
    {
        _limits = options.Value.Limits;
        _fileStorage = fileStorage;
        _common = common;
        _bookRepository = bookRepository;
        _contactRepository = contactRepository;
    }

    #region Public Methods

    // The contact's entries stay (soft delete), so the history is not lost; its picture is removed.
    public async Task<string> DeleteAsync(KhataCallerDto caller, int contactId, CancellationToken cancellationToken)
    {
        var contact = await RequireContactAsync(caller, contactId, cancellationToken);
        var photo = await DetachPhotoAsync(contact, cancellationToken);

        contact.IsSoftDeleted = true;
        contact.ModifiedOn = DateTime.UtcNow;
        await _contactRepository.SaveChangesAsync(cancellationToken);
        await DeleteFileAsync(photo);
        await _common.Audit.WriteAsync(KhataAuditActions.ContactDeleted, caller.UserId, caller, new { ContactId = contactId, contact.BookId }, cancellationToken);

        return await _common.Messages.GetAsync(MessageCodes.KhataContactDeleted);
    }

    // A deleted contact brings back its details, not its picture (removed when it was deleted). The book's contact limit still applies.
    public async Task<string> RestoreAsync(KhataCallerDto caller, int contactId, CancellationToken cancellationToken)
    {
        var contact = await _contactRepository.GetReadableContactAsync(contactId, caller.UserId, cancellationToken) ?? throw new BusinessException(MessageCodes.KhataContactNotFound, 404);

        if (contact.IsSoftDeleted)
        {
            if (await _contactRepository.CountContactsAsync(contact.BookId, cancellationToken) >= _limits.MaxContactsPerBook)
                throw new BusinessException(MessageCodes.KhataContactLimit, 409, _limits.MaxContactsPerBook);

            contact.IsSoftDeleted = false;
            contact.ModifiedOn = DateTime.UtcNow;
            await _contactRepository.SaveChangesAsync(cancellationToken);
            await _common.Audit.WriteAsync(KhataAuditActions.ContactRestored, caller.UserId, caller, new { ContactId = contactId, contact.BookId }, cancellationToken);
        }

        return await _common.Messages.GetAsync(MessageCodes.KhataContactRestored);
    }

    public async Task<string> DeletePhotoAsync(KhataCallerDto caller, int contactId, CancellationToken cancellationToken)
    {
        var contact = await RequireContactAsync(caller, contactId, cancellationToken);

        if (contact.PhotoStoredFileId is null)
            throw new BusinessException(MessageCodes.KhataContactPhotoNotFound, 404);

        var photo = await DetachPhotoAsync(contact, cancellationToken);
        contact.ModifiedOn = DateTime.UtcNow;
        await _contactRepository.SaveChangesAsync(cancellationToken);
        await DeleteFileAsync(photo);
        await _common.Audit.WriteAsync(KhataAuditActions.ContactPhotoRemoved, caller.UserId, caller, new { ContactId = contactId }, cancellationToken);

        return await _common.Messages.GetAsync(MessageCodes.KhataContactPhotoDeleted);
    }

    // Read from whichever store its KhataStoredFiles row names; the type follows the extension it was saved with.
    public async Task<FileStreamDto> OpenPhotoAsync(KhataCallerDto caller, int contactId, CancellationToken cancellationToken)
    {
        var contact = await RequireContactAsync(caller, contactId, cancellationToken);
        var photo = contact.PhotoStoredFileId is int photoId ? await _contactRepository.GetStoredFileAsync(photoId, cancellationToken) : null;
        var store = photo is null ? null : _fileStorage.Get((KhataStorageProvider)photo.Provider);
        var content = store is null || photo?.FileId is null ? null : await store.OpenAsync(photo.FileId, cancellationToken);

        return content is null ? throw new BusinessException(MessageCodes.KhataContactPhotoNotFound, 404) : new FileStreamDto { Content = content, ContentType = KhataImageType.FromFileId(photo!.FileId!) };
    }

    public async Task<ContactNotifyDto> GetNotificationsAsync(KhataCallerDto caller, int contactId, CancellationToken cancellationToken)
    {
        await RequireContactAsync(caller, contactId, cancellationToken);

        return KhataMapper.ToDto(await _contactRepository.GetNotificationPrefAsync(contactId, cancellationToken));
    }

    // includeDeleted adds the soft-deleted contacts (IsDeleted = true), for the All and Deleted tabs of the parties screen.
    public async Task<BookContactsDto> GetByBookAsync(KhataCallerDto caller, int bookId, bool includeDeleted, CancellationToken cancellationToken)
    {
        var books = await _bookRepository.GetBookSummariesAsync(caller.UserId, bookId, null, cancellationToken);
        var book = books.FirstOrDefault() ?? throw new BusinessException(MessageCodes.KhataBookNotFound, 404);
        var contacts = await _contactRepository.GetContactsAsync(bookId, includeDeleted, cancellationToken);
        var prefs = (await _contactRepository.GetNotificationPrefsAsync(bookId, cancellationToken)).ToDictionary(p => p.ContactId);

        return new BookContactsDto { Book = book, Contacts = contacts.Select(c => KhataMapper.ToDto(c.Contact, c.LastEntryOn, prefs.GetValueOrDefault(c.Contact.Id))).ToList() };
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

    // One JPG, PNG or WebP of at most Khata:Limits:MaxContactPhotoBytes, kept in the site's file store (KhataStoredFiles, FileKind ContactPhoto).
    // It replaces the previous picture; if saving the rows fails, the new file is removed again.
    public async Task<ServiceResultDto<ContactDto>> SetPhotoAsync(KhataCallerDto caller, int contactId, PhotoUploadDto file, CancellationToken cancellationToken)
    {
        var contact = await RequireContactAsync(caller, contactId, cancellationToken);
        var (bytes, contentType) = await ReadPhotoAsync(file, cancellationToken);
        var store = await _fileStorage.GetUploadStoreAsync(cancellationToken);
        var fileId = await store.SaveAsync(caller.UserId, contact.BookId, $"contact-{Guid.NewGuid():N}{KhataImageType.Extensions[contentType]}", bytes, contentType, cancellationToken);
        var storedFile = new KhataStoredFile { UserId = caller.UserId, BookId = contact.BookId, ContactId = contactId, FileKind = (byte)KhataFileKind.ContactPhoto, Role = (byte)KhataFileRole.Home, Provider = (byte)store.Provider, FileId = fileId, SyncStatus = (byte)KhataSyncStatus.Synced };
        KhataStoredFile? previous;

        try
        {
            previous = await DetachPhotoAsync(contact, cancellationToken);
            await _contactRepository.SetPhotoAsync(contact, storedFile, cancellationToken);
        }
        catch
        {
            await store.DeleteAsync(fileId, CancellationToken.None);
            throw;
        }

        await DeleteFileAsync(previous);
        await _common.Audit.WriteAsync(KhataAuditActions.ContactPhotoSet, caller.UserId, caller, new { ContactId = contactId, StoredFileId = storedFile.Id }, cancellationToken);
        var lastEntryOn = await _contactRepository.GetLastEntryOnAsync(contactId, cancellationToken);
        var dto = KhataMapper.ToDto(contact, lastEntryOn, await _contactRepository.GetNotificationPrefAsync(contactId, cancellationToken));

        return new ServiceResultDto<ContactDto> { Data = dto, Message = await _common.Messages.GetAsync(MessageCodes.KhataContactPhotoSaved) };
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

    // E-mail messages need the party's e-mail address, SMS and WhatsApp their mobile number. Who changed the choice and when is kept (consent) and audited.
    public async Task<ServiceResultDto<ContactNotifyDto>> SetNotificationsAsync(KhataCallerDto caller, int contactId, ContactNotifyDto request, CancellationToken cancellationToken)
    {
        var contact = await RequireContactAsync(caller, contactId, cancellationToken);

        if (request.Email && contact.Email is null)
            throw new BusinessException(MessageCodes.KhataNotifyEmailMissing, 400);

        if (request.Sms && contact.Mobile is null)
            throw new BusinessException(MessageCodes.KhataNotifyMobileMissing, 400);

        if (request.WhatsApp && contact.Mobile is null)
            throw new BusinessException(MessageCodes.KhataNotifyWhatsAppMissing, 400);

        var now = DateTime.UtcNow;
        var pref = await _contactRepository.GetNotificationPrefAsync(contactId, cancellationToken) ?? new KhataNotificationPref { ContactId = contactId };
        pref.NotifyPush = request.App;
        pref.NotifySms = request.Sms;
        pref.NotifyEmail = request.Email;
        pref.NotifyWhatsApp = request.WhatsApp;
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

        await _common.Audit.WriteAsync(KhataAuditActions.NotifyChanged, caller.UserId, caller, new { ContactId = contactId, request.App, request.Sms, request.Email, request.WhatsApp }, cancellationToken);

        return new ServiceResultDto<ContactNotifyDto> { Data = KhataMapper.ToDto(pref), Message = await _common.Messages.GetAsync(MessageCodes.KhataNotifySaved) };
    }

    #endregion

    #region Private Methods

    private string? Optional(string? value, int maxLength)
    {
        var text = value?.Trim();
        if (text is { Length: > 0 } && text.Length > maxLength)
            throw new BusinessException(MessageCodes.KhataContactInvalid, 400, _limits.ContactNameLength);

        return string.IsNullOrEmpty(text) ? null : text;
    }

    // The rows are already saved, so a file that cannot be removed now is only left behind.
    private async Task DeleteFileAsync(KhataStoredFile? storedFile)
    {
        var store = storedFile is null ? null : _fileStorage.Get((KhataStorageProvider)storedFile.Provider);

        if (store is not null && storedFile?.FileId is not null)
            await store.DeleteAsync(storedFile.FileId, CancellationToken.None);
    }

    // An empty mobile or email is allowed; a filled one must be valid (same rules as login, so the contact can be linked when they log in).
    private void Apply(KhataContact contact, ContactRequestDto request)
    {
        var name = request.Name.Trim();
        var mobile = string.IsNullOrWhiteSpace(request.Mobile) ? null : KhataIdentifier.Mobile(request.Mobile);
        var email = string.IsNullOrWhiteSpace(request.Email) ? null : KhataIdentifier.Email(request.Email);
        var invalidMobile = !string.IsNullOrWhiteSpace(request.Mobile) && mobile is null;
        var invalidEmail = !string.IsNullOrWhiteSpace(request.Email) && email is null;
        if (name.Length == 0 || name.Length > _limits.ContactNameLength || invalidMobile || invalidEmail || !Enum.IsDefined(request.ContactType))
            throw new BusinessException(MessageCodes.KhataContactInvalid, 400, _limits.ContactNameLength);

        contact.Name = name;
        contact.Mobile = mobile;
        contact.Email = email;
        contact.Address = Optional(request.Address, _limits.ContactAddressLength);
        contact.Note = Optional(request.Note, _limits.NoteLength);
        contact.ContactType = (byte)request.ContactType;
    }

    // Unlinks the current picture and marks its row deleted (saved with the caller's next save); the file itself is removed after that save.
    private async Task<KhataStoredFile?> DetachPhotoAsync(KhataContact contact, CancellationToken cancellationToken)
    {
        var previous = contact.PhotoStoredFileId is int photoId ? await _contactRepository.GetStoredFileAsync(photoId, cancellationToken) : null;
        contact.PhotoStoredFileId = null;

        if (previous is null)
            return null;

        previous.IsSoftDeleted = true;
        previous.ModifiedOn = DateTime.UtcNow;

        return previous;
    }

    private async Task<(byte[] Bytes, string ContentType)> ReadPhotoAsync(PhotoUploadDto file, CancellationToken cancellationToken)
    {
        var invalid = new BusinessException(MessageCodes.KhataContactPhotoInvalid, 400, Math.Max(1, _limits.MaxContactPhotoBytes / 1024));

        if (file.Length <= 0 || file.Length > _limits.MaxContactPhotoBytes)
            throw invalid;

        using var buffer = new MemoryStream();
        await file.Content.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();
        var contentType = bytes.Length > _limits.MaxContactPhotoBytes ? null : KhataImageType.Detect(bytes);

        return contentType is "image/jpeg" or "image/png" or "image/webp" ? (bytes, contentType) : throw invalid;
    }

    private async Task<KhataContact> RequireContactAsync(KhataCallerDto caller, int contactId, CancellationToken cancellationToken)
    {
        return await _contactRepository.GetContactAsync(contactId, caller.UserId, cancellationToken) ?? throw new BusinessException(MessageCodes.KhataContactNotFound, 404);
    }

    #endregion
}
