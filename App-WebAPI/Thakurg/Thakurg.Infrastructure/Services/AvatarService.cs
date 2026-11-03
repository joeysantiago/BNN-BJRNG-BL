using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Abstractions;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Infrastructure.Services;

// Profile pictures: one file per user in Avatars:Root (App-Data/avatars, never committed), named <userId>-<ticks><ext> so every upload gets a new URL.
// The file's first bytes must really be a JPG, PNG or WebP picture; the extension alone is not trusted.
public class AvatarService : IAvatarService
{
    private readonly string _root;

    private readonly AvatarOptions _options;

    private readonly IAuthService _authService;

    private readonly IAuthRepository _authRepository;

    private readonly IMessageService _messageService;

    private static readonly Dictionary<string, string> ContentTypes = new() { [".jpg"] = "image/jpeg", [".jpeg"] = "image/jpeg", [".png"] = "image/png", [".webp"] = "image/webp" };

    public AvatarService(IOptions<AvatarOptions> options, IHostEnvironment environment, IAuthRepository authRepository, IAuthService authService, IMessageService messageService)
    {
        _options = options.Value;
        _root = Path.GetFullPath(Path.Combine(environment.ContentRootPath, _options.Root));
        _authRepository = authRepository;
        _authService = authService;
        _messageService = messageService;
    }

    #region Public Methods

    public async Task<FileStreamDto> OpenAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await _authRepository.GetUserAsync(userId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthAvatarNotFound, 404);
        var path = user.AvatarFile is null ? null : Path.Combine(_root, user.AvatarFile);

        if (path is null || !File.Exists(path))
            throw new BusinessException(MessageCodes.AuthAvatarNotFound, 404);

        return new FileStreamDto { Content = File.OpenRead(path), ContentType = ContentTypes.GetValueOrDefault(Path.GetExtension(path), "application/octet-stream"), FileName = user.AvatarFile };
    }

    public async Task<ServiceResultDto<UserDto>> RemoveAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await _authRepository.GetUserAsync(userId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);
        var old = user.AvatarFile;
        user.AvatarFile = null;
        user.ModifiedBy = user.Id;
        user.ModifiedOn = DateTime.UtcNow;
        await _authRepository.SaveChangesAsync(cancellationToken);
        DeleteFile(old);

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
        Directory.CreateDirectory(_root);
        await File.WriteAllBytesAsync(Path.Combine(_root, name), buffer.ToArray(), cancellationToken);
        var old = user.AvatarFile;
        user.AvatarFile = name;
        user.ModifiedBy = user.Id;
        user.ModifiedOn = DateTime.UtcNow;
        await _authRepository.SaveChangesAsync(cancellationToken);
        DeleteFile(old);

        return new ServiceResultDto<UserDto> { Data = await _authService.GetMeAsync(user.Id, cancellationToken), Message = await _messageService.GetAsync(MessageCodes.AuthAvatarSaved) };
    }

    #endregion

    #region Private Methods

    private void DeleteFile(string? name)
    {
        var path = name is null ? null : Path.Combine(_root, Path.GetFileName(name));

        if (path is not null && File.Exists(path))
            File.Delete(path);
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

    #endregion
}
