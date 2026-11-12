using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Application.Storage;
using Thakurg.Contracts.Abstractions;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Infrastructure.Services;

// Profile pictures: one file per user in the Avatars:Folder of the file store (App-Data/avatars or <env>/avatars in the container), named <userId>-<ticks><ext>
// so every upload gets a new URL. The file's first bytes must really be a JPG, PNG or WebP picture; the extension alone is not trusted.
public class AvatarService : IAvatarService
{
    private readonly IFileStore _fileStore;

    private readonly AvatarOptions _options;

    private readonly IAuthService _authService;

    private readonly IAuthRepository _authRepository;

    private readonly IMessageService _messageService;

    private static readonly Dictionary<string, string> ContentTypes = new() { [".jpg"] = "image/jpeg", [".jpeg"] = "image/jpeg", [".png"] = "image/png", [".webp"] = "image/webp" };

    public AvatarService(IOptions<AvatarOptions> options, IFileStore fileStore, IAuthRepository authRepository, IAuthService authService, IMessageService messageService)
    {
        _options = options.Value;
        _fileStore = fileStore;
        _authRepository = authRepository;
        _authService = authService;
        _messageService = messageService;
    }

    #region Public Methods

    public async Task<FileStreamDto> OpenAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await _authRepository.GetUserAsync(userId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthAvatarNotFound, 404);
        var content = user.AvatarFile is null ? null : await _fileStore.OpenAsync(PathOf(user.AvatarFile), cancellationToken);

        if (content is null)
            throw new BusinessException(MessageCodes.AuthAvatarNotFound, 404);

        return new FileStreamDto { Content = content, ContentType = ContentTypes.GetValueOrDefault(Path.GetExtension(user.AvatarFile!), "application/octet-stream"), FileName = user.AvatarFile };
    }

    public async Task<ServiceResultDto<UserDto>> RemoveAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await _authRepository.GetUserAsync(userId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);
        var old = user.AvatarFile;
        user.AvatarFile = null;
        user.ModifiedBy = user.Id;
        user.ModifiedOn = DateTime.UtcNow;
        await _authRepository.SaveChangesAsync(cancellationToken);
        await DeleteFileAsync(old, cancellationToken);

        return new ServiceResultDto<UserDto> { Data = await _authService.GetMeAsync(user.Id, cancellationToken), Message = await _messageService.GetAsync(MessageCodes.AuthAvatarRemoved) };
    }

    public async Task<ServiceResultDto<UserDto>> SaveAsync(int userId, Stream content, string fileName, long length, CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var megabytes = Math.Max(1, _options.MaxBytes / (1024 * 1024));

        if (length <= 0 || length > _options.MaxBytes || !_options.Extensions.Contains(extension) || !ContentTypes.ContainsKey(extension))
            throw new BusinessException(MessageCodes.AuthAvatarInvalid, 400, megabytes);

        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, cancellationToken);

        if (buffer.Length > _options.MaxBytes || !IsPicture(buffer.GetBuffer(), extension))
            throw new BusinessException(MessageCodes.AuthAvatarInvalid, 400, megabytes);

        var user = await _authRepository.GetUserAsync(userId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);
        var name = $"{user.Id}-{DateTime.UtcNow.Ticks}{extension}";
        buffer.Position = 0;
        await _fileStore.SaveAsync(PathOf(name), buffer, cancellationToken);
        var old = user.AvatarFile;
        user.AvatarFile = name;
        user.ModifiedBy = user.Id;
        user.ModifiedOn = DateTime.UtcNow;
        await _authRepository.SaveChangesAsync(cancellationToken);
        await DeleteFileAsync(old, cancellationToken);

        return new ServiceResultDto<UserDto> { Data = await _authService.GetMeAsync(user.Id, cancellationToken), Message = await _messageService.GetAsync(MessageCodes.AuthAvatarSaved) };
    }

    #endregion

    #region Private Methods

    private string PathOf(string name)
    {
        return $"{_options.Folder}/{Path.GetFileName(name)}";
    }

    // JPG starts FF D8 FF, PNG 89 50 4E 47, WebP "RIFF" .... "WEBP".
    private static bool IsPicture(byte[] head, string extension)
    {
        return extension switch
        {
            ".jpg" or ".jpeg" => head is [0xFF, 0xD8, 0xFF, ..],
            ".png" => head is [0x89, 0x50, 0x4E, 0x47, ..],
            ".webp" => head is [0x52, 0x49, 0x46, 0x46, _, _, _, _, 0x57, 0x45, 0x42, 0x50, ..],
            _ => false
        };
    }

    private async Task DeleteFileAsync(string? name, CancellationToken cancellationToken)
    {
        if (name is not null)
            await _fileStore.DeleteAsync(PathOf(name), cancellationToken);
    }

    #endregion
}
