using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Abstractions;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// Bill photos of entries, kept in the site's chosen store (IKhataFileStorage): local files in Khata:LocalFiles:Root (App-Data/khata, never committed) as
// {userId}/{bookId}/{random name}.{ext}, or Azure Blob as khata/{userId}/{bookId}/{random name}.{ext}. Each photo is read and deleted where its KhataStoredFiles row says.
// A photo's type is taken from its first bytes; the file name and the request header are not trusted.
// Anyone who can see an entry can see its photos; only whoever added the entry may add or remove them.
public class KhataAttachmentService : IKhataAttachmentService
{
    private readonly KhataLimitsOptions _limits;

    private readonly IKhataCommonServices _common;

    private readonly IKhataFileStorage _fileStorage;

    private readonly IKhataContactRepository _contactRepository;

    private readonly IKhataAttachmentRepository _attachmentRepository;

    private readonly IKhataTransactionRepository _transactionRepository;

    public KhataAttachmentService(IOptions<KhataOptions> options, IKhataFileStorage fileStorage, IKhataCommonServices common, IKhataContactRepository contactRepository,
        IKhataTransactionRepository transactionRepository, IKhataAttachmentRepository attachmentRepository)
    {
        _limits = options.Value.Limits;
        _fileStorage = fileStorage;
        _common = common;
        _contactRepository = contactRepository;
        _transactionRepository = transactionRepository;
        _attachmentRepository = attachmentRepository;
    }

    #region Public Methods

    public async Task<string> DeleteAsync(KhataCallerDto caller, int attachmentId, CancellationToken cancellationToken)
    {
        var (attachment, entry) = await RequireVisibleAttachmentAsync(caller, attachmentId, false, cancellationToken);
        if (entry.AddedByUserId != caller.UserId)
            throw new BusinessException(MessageCodes.KhataEntryNotYours, 403);

        var storedFiles = await _attachmentRepository.GetStoredFilesAsync(attachmentId, cancellationToken);
        var now = DateTime.UtcNow;
        attachment.IsSoftDeleted = true;
        attachment.ModifiedOn = now;

        foreach (var storedFile in storedFiles)
        {
            storedFile.IsSoftDeleted = true;
            storedFile.ModifiedOn = now;
        }

        await _attachmentRepository.SaveChangesAsync(cancellationToken);

        foreach (var storedFile in storedFiles)
            await DeleteFileAsync(_fileStorage.Get((KhataStorageProvider)storedFile.Provider), storedFile.FileId);

        await _common.Audit.WriteAsync(KhataAuditActions.PhotoDeleted, caller.UserId, caller, new { AttachmentId = attachmentId, attachment.TransactionId }, cancellationToken);

        return await _common.Messages.GetAsync(MessageCodes.KhataAttachmentDeleted);
    }

    public async Task<FileStreamDto> OpenAsync(KhataCallerDto caller, int attachmentId, CancellationToken cancellationToken)
    {
        var (attachment, _) = await RequireVisibleAttachmentAsync(caller, attachmentId, true, cancellationToken);
        var storedFiles = await _attachmentRepository.GetStoredFilesAsync(attachmentId, cancellationToken);

        foreach (var storedFile in storedFiles.Where(f => f.Role == (byte)KhataFileRole.Home && f.FileId is not null))
        {
            var store = _fileStorage.Get((KhataStorageProvider)storedFile.Provider);
            var content = store is null ? null : await store.OpenAsync(storedFile.FileId!, cancellationToken);

            if (content is not null)
                return new FileStreamDto { Content = content, ContentType = attachment.ContentType, FileName = attachment.FileName };
        }

        throw new BusinessException(MessageCodes.KhataAttachmentNotFound, 404);
    }

    // Every photo is checked before anything is written; if saving the rows fails, the files written so far are removed again.
    public async Task<List<AttachmentDto>> UploadAsync(KhataCallerDto caller, int transactionId, List<PhotoUploadDto> files, CancellationToken cancellationToken)
    {
        var entry = await RequireOwnEntryAsync(caller, transactionId, cancellationToken);
        if (files.Count == 0)
            throw PhotoInvalid();

        var current = await _attachmentRepository.GetAttachmentsAsync(transactionId, cancellationToken);
        if (current.Count + files.Count > _limits.MaxPhotosPerEntry)
            throw new BusinessException(MessageCodes.KhataPhotoLimit, 400, _limits.MaxPhotosPerEntry);

        var photos = new List<(byte[] Bytes, string ContentType, string FileName)>();

        foreach (var file in files)
            photos.Add(await ReadPhotoAsync(file, cancellationToken));

        var sortOrder = current.Count == 0 ? 0 : current.Max(a => a.SortOrder);
        var rows = new List<(KhataAttachment Attachment, KhataStoredFile StoredFile)>();
        var store = await _fileStorage.GetUploadStoreAsync(cancellationToken);

        try
        {
            foreach (var (bytes, contentType, fileName) in photos)
            {
                var fileId = await store.SaveAsync(caller.UserId, entry.BookId, $"{Guid.NewGuid():N}{KhataImageType.Extensions[contentType]}", bytes, contentType, cancellationToken);
                var attachment = new KhataAttachment { TransactionId = transactionId, FileName = fileName, ContentType = contentType, SizeBytes = bytes.Length, Md5 = Convert.ToHexStringLower(MD5.HashData(bytes)), SortOrder = ++sortOrder };
                var storedFile = new KhataStoredFile { UserId = caller.UserId, BookId = entry.BookId, ContactId = entry.ContactId, FileKind = (byte)KhataFileKind.Photo, Role = (byte)KhataFileRole.Home, Provider = (byte)store.Provider, FileId = fileId, SyncStatus = (byte)KhataSyncStatus.Synced };
                rows.Add((attachment, storedFile));
            }

            await _attachmentRepository.AddAsync(rows, cancellationToken);
        }
        catch
        {
            foreach (var row in rows)
                await DeleteFileAsync(store, row.StoredFile.FileId);

            throw;
        }

        await _common.Audit.WriteAsync(KhataAuditActions.PhotosAdded, caller.UserId, caller, new { TransactionId = transactionId, Count = rows.Count }, cancellationToken);
        var attachments = await _attachmentRepository.GetAttachmentsAsync(transactionId, cancellationToken);

        return attachments.Select(KhataMapper.ToDto).ToList();
    }

    #endregion

    #region Private Methods

    private BusinessException PhotoInvalid()
    {
        return new BusinessException(MessageCodes.KhataPhotoInvalid, 400, Math.Max(1, _limits.MaxPhotoBytes / (1024 * 1024)));
    }

    // The original name without folders or characters a file name can't hold, cut to the column size; the extension follows the real type.
    private string SafeFileName(string fileName, string contentType)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var name = new string(Path.GetFileNameWithoutExtension(Path.GetFileName(fileName.Replace('\\', '/'))).Where(c => !char.IsControl(c) && !invalid.Contains(c)).ToArray()).Trim();
        var extension = KhataImageType.Extensions[contentType];
        name = name.Length == 0 ? "photo" : name[..Math.Min(name.Length, _limits.PhotoFileNameLength - extension.Length)];

        return name + extension;
    }

    private static async Task DeleteFileAsync(IKhataFileStore? store, string? fileId)
    {
        if (store is not null && fileId is not null)
            await store.DeleteAsync(fileId, CancellationToken.None);
    }

    // Only whoever added an entry may add photos to it, and only while it is not deleted.
    private async Task<KhataTransaction> RequireOwnEntryAsync(KhataCallerDto caller, int transactionId, CancellationToken cancellationToken)
    {
        var entry = await _transactionRepository.GetTransactionAsync(transactionId, cancellationToken);
        if (entry is null || await _contactRepository.GetContactAsync(entry.ContactId, caller.UserId, cancellationToken) is null)
            throw new BusinessException(MessageCodes.KhataEntryNotFound, 404);

        if (entry.AddedByUserId != caller.UserId)
            throw new BusinessException(MessageCodes.KhataEntryNotYours, 403);

        return entry;
    }

    private async Task<(byte[] Bytes, string ContentType, string FileName)> ReadPhotoAsync(PhotoUploadDto file, CancellationToken cancellationToken)
    {
        if (file.Length <= 0 || file.Length > _limits.MaxPhotoBytes)
            throw PhotoInvalid();

        using var buffer = new MemoryStream();
        await file.Content.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();
        var contentType = bytes.Length > _limits.MaxPhotoBytes ? null : KhataImageType.Detect(bytes);

        return contentType is null ? throw PhotoInvalid() : (bytes, contentType, SafeFileName(file.FileName, contentType));
    }

    // Visible = the photo's entry (deleted or not) belongs to one of the caller's own contacts. A deleted contact's photos can still be read (readOnly), not changed.
    private async Task<(KhataAttachment Attachment, KhataTransaction Entry)> RequireVisibleAttachmentAsync(KhataCallerDto caller, int attachmentId, bool readOnly, CancellationToken cancellationToken)
    {
        var attachment = await _attachmentRepository.GetAttachmentAsync(attachmentId, cancellationToken);
        var entry = attachment is null ? null : await _transactionRepository.GetAnyTransactionAsync(attachment.TransactionId, cancellationToken);
        var contact = entry is null ? null : readOnly ? await _contactRepository.GetReadableContactAsync(entry.ContactId, caller.UserId, cancellationToken) : await _contactRepository.GetContactAsync(entry.ContactId, caller.UserId, cancellationToken);
        if (attachment is null || entry is null || contact is null)
            throw new BusinessException(MessageCodes.KhataAttachmentNotFound, 404);

        return (attachment, entry);
    }

    #endregion
}
