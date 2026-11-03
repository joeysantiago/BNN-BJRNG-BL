using System.Security.Cryptography;
using Microsoft.Extensions.Hosting;
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

// Bill photos of entries, kept in Khata:LocalFiles:Root (App-Data/khata, never committed) as {userId}/{bookId}/{random name}.{ext}.
// A photo's type is taken from its first bytes; the file name and the request header are not trusted.
// Anyone who can see an entry can see its photos; only whoever added the entry may add or remove them.
public class KhataAttachmentService : IKhataAttachmentService
{
    private readonly string _root;

    private const int MaxFileNameLength = 260;

    private readonly KhataLimitsOptions _limits;

    private readonly IKhataCommonServices _common;

    private readonly IKhataContactRepository _contactRepository;

    private readonly IKhataAttachmentRepository _attachmentRepository;

    private readonly IKhataTransactionRepository _transactionRepository;

    private static readonly Dictionary<string, string> Extensions = new() { ["image/jpeg"] = ".jpg", ["image/png"] = ".png", ["image/webp"] = ".webp", ["image/gif"] = ".gif" };

    public KhataAttachmentService(IOptions<KhataOptions> options, IHostEnvironment environment, IKhataCommonServices common, IKhataContactRepository contactRepository, IKhataTransactionRepository transactionRepository, IKhataAttachmentRepository attachmentRepository)
    {
        _limits = options.Value.Limits;
        _root = Path.GetFullPath(Path.Combine(environment.ContentRootPath, options.Value.LocalFiles.Root));
        _common = common;
        _contactRepository = contactRepository;
        _transactionRepository = transactionRepository;
        _attachmentRepository = attachmentRepository;
    }

    #region Public Methods

    public async Task<string> DeleteAsync(KhataCallerDto caller, int attachmentId, CancellationToken cancellationToken)
    {
        var (attachment, entry) = await RequireVisibleAttachmentAsync(caller, attachmentId, cancellationToken);
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

        foreach (var storedFile in storedFiles.Where(f => f.Provider == (byte)KhataStorageProvider.Local))
            DeleteFile(storedFile.FileId);

        await _common.Audit.WriteAsync(KhataAuditActions.PhotoDeleted, caller.UserId, caller, new { AttachmentId = attachmentId, attachment.TransactionId }, cancellationToken);

        return await _common.Messages.GetAsync(MessageCodes.KhataAttachmentDeleted);
    }

    public async Task<FileStreamDto> OpenAsync(KhataCallerDto caller, int attachmentId, CancellationToken cancellationToken)
    {
        var (attachment, _) = await RequireVisibleAttachmentAsync(caller, attachmentId, cancellationToken);
        var storedFiles = await _attachmentRepository.GetStoredFilesAsync(attachmentId, cancellationToken);
        var path = storedFiles.Where(f => f.Provider == (byte)KhataStorageProvider.Local && f.Role == (byte)KhataFileRole.Home).Select(f => FullPath(f.FileId)).FirstOrDefault(p => p is not null && File.Exists(p));
        if (path is null)
            throw new BusinessException(MessageCodes.KhataAttachmentNotFound, 404);

        return new FileStreamDto { Content = File.OpenRead(path), ContentType = attachment.ContentType, FileName = attachment.FileName };
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
        Directory.CreateDirectory(Path.Combine(_root, caller.UserId.ToString(), entry.BookId.ToString()));

        try
        {
            foreach (var (bytes, contentType, fileName) in photos)
            {
                var fileId = $"{caller.UserId}/{entry.BookId}/{Guid.NewGuid():N}{Extensions[contentType]}";
                await File.WriteAllBytesAsync(Path.Combine(_root, fileId), bytes, cancellationToken);
                var attachment = new KhataAttachment { TransactionId = transactionId, FileName = fileName, ContentType = contentType, SizeBytes = bytes.Length, Md5 = Convert.ToHexStringLower(MD5.HashData(bytes)), SortOrder = ++sortOrder };
                var storedFile = new KhataStoredFile { UserId = caller.UserId, BookId = entry.BookId, ContactId = entry.ContactId, FileKind = (byte)KhataFileKind.Photo, Role = (byte)KhataFileRole.Home, Provider = (byte)KhataStorageProvider.Local, FileId = fileId, SyncStatus = (byte)KhataSyncStatus.Synced };
                rows.Add((attachment, storedFile));
            }

            await _attachmentRepository.AddAsync(rows, cancellationToken);
        }
        catch
        {
            foreach (var row in rows)
                DeleteFile(row.StoredFile.FileId);

            throw;
        }

        await _common.Audit.WriteAsync(KhataAuditActions.PhotosAdded, caller.UserId, caller, new { TransactionId = transactionId, Count = rows.Count }, cancellationToken);
        var attachments = await _attachmentRepository.GetAttachmentsAsync(transactionId, cancellationToken);

        return attachments.Select(KhataMapper.ToDto).ToList();
    }

    #endregion

    #region Private Methods

    private void DeleteFile(string? fileId)
    {
        var path = FullPath(fileId);
        if (path is not null && File.Exists(path))
            File.Delete(path);
    }

    private BusinessException PhotoInvalid()
    {
        return new BusinessException(MessageCodes.KhataPhotoInvalid, 400, Math.Max(1, _limits.MaxPhotoBytes / (1024 * 1024)));
    }

    // The full path of a stored file, or null when the stored path would lead outside the root folder.
    private string? FullPath(string? fileId)
    {
        var path = fileId is null ? null : Path.GetFullPath(Path.Combine(_root, fileId));

        return path is not null && path.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) ? path : null;
    }

    // JPG starts FF D8 FF, PNG 89 50 4E 47 0D 0A 1A 0A, GIF "GIF87a" / "GIF89a", WebP "RIFF" .... "WEBP".
    private static string? PhotoType(byte[] head)
    {
        return head switch
        {
            [0xFF, 0xD8, 0xFF, ..] => "image/jpeg",
            [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ..] => "image/png",
            [0x47, 0x49, 0x46, 0x38, 0x37 or 0x39, 0x61, ..] => "image/gif",
            [0x52, 0x49, 0x46, 0x46, _, _, _, _, 0x57, 0x45, 0x42, 0x50, ..] => "image/webp",
            _ => null
        };
    }

    // The original name without folders or characters a file name can't hold, cut to the column size; the extension follows the real type.
    private static string SafeFileName(string fileName, string contentType)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var name = new string(Path.GetFileNameWithoutExtension(Path.GetFileName(fileName.Replace('\\', '/'))).Where(c => !char.IsControl(c) && !invalid.Contains(c)).ToArray()).Trim();
        var extension = Extensions[contentType];
        name = name.Length == 0 ? "photo" : name[..Math.Min(name.Length, MaxFileNameLength - extension.Length)];

        return name + extension;
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
        var contentType = bytes.Length > _limits.MaxPhotoBytes ? null : PhotoType(bytes);

        return contentType is null ? throw PhotoInvalid() : (bytes, contentType, SafeFileName(file.FileName, contentType));
    }

    // Visible = the photo's entry (deleted or not) belongs to one of the caller's own contacts.
    private async Task<(KhataAttachment Attachment, KhataTransaction Entry)> RequireVisibleAttachmentAsync(KhataCallerDto caller, int attachmentId, CancellationToken cancellationToken)
    {
        var attachment = await _attachmentRepository.GetAttachmentAsync(attachmentId, cancellationToken);
        var entry = attachment is null ? null : await _transactionRepository.GetAnyTransactionAsync(attachment.TransactionId, cancellationToken);
        if (attachment is null || entry is null || await _contactRepository.GetContactAsync(entry.ContactId, caller.UserId, cancellationToken) is null)
            throw new BusinessException(MessageCodes.KhataAttachmentNotFound, 404);

        return (attachment, entry);
    }

    #endregion
}
