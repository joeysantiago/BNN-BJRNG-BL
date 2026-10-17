using System.Text.RegularExpressions;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Application.Storage;
using Thakurg.Contracts.Abstractions;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Music;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

public class MusicService : IMusicService
{
    private readonly IMusicFileStore _fileStore;

    private readonly StreamingOptions _streaming;

    private readonly MusicStorageOptions _options;

    private readonly IMessageService _messageService;

    private readonly IMusicRepository _musicRepository;

    private readonly IMusicAccessService _accessService;

    private static readonly FileExtensionContentTypeProvider ContentTypes = new();

    private static readonly Regex LeadingNumber = new(@"^\s*\d{1,3}\s*[-.)]\s+", RegexOptions.Compiled);

    private static readonly Regex BitrateTag = new(@"\s*[\[(]?\s*\d{2,3}\s*kbps\s*[\])]?", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public MusicService(IOptions<MusicStorageOptions> options, IOptions<StreamingOptions> streaming, IMusicFileStore fileStore, IMessageService messageService, IMusicRepository musicRepository, IMusicAccessService accessService)
    {
        _options = options.Value;
        _streaming = streaming.Value;
        _fileStore = fileStore;
        _messageService = messageService;
        _musicRepository = musicRepository;
        _accessService = accessService;
    }

    #region Public Methods

    public async Task<MusicTracksDto> ListAsync(string player, CancellationToken cancellationToken)
    {
        var musicPlayer = await RequirePlayerAsync(player, cancellationToken);
        var tracks = await _musicRepository.GetTracksAsync(musicPlayer.Id, cancellationToken);

        return ToDto(musicPlayer, tracks);
    }

    public async Task<FileStreamDto> OpenCoverAsync(string player, int trackId, CancellationToken cancellationToken)
    {
        var musicPlayer = await RequirePlayerAsync(player, cancellationToken);
        var track = await RequireTrackAsync(musicPlayer, trackId, cancellationToken);

        if (track.CoverFileName is null)
            throw new BusinessException(MessageCodes.MusicFileMissing, 404);

        return OpenFile(musicPlayer, track.CoverFileName);
    }

    public async Task<string> DeleteAsync(string player, int trackId, string? password, CancellationToken cancellationToken)
    {
        var musicPlayer = await RequirePlayerAsync(player, cancellationToken);
        _accessService.VerifyEditPassword(musicPlayer, password);
        var track = await RequireTrackAsync(musicPlayer, trackId, cancellationToken);

        await _musicRepository.RemoveTrackAsync(track, cancellationToken);
        _fileStore.Delete(musicPlayer.FolderName, track.FileName);

        if (track.CoverFileName is not null)
            _fileStore.Delete(musicPlayer.FolderName, track.CoverFileName);

        return await _messageService.GetAsync(MessageCodes.MusicTrackDeleted);
    }

    public async Task<FileStreamDto> OpenAudioAsync(string player, int trackId, string? range, CancellationToken cancellationToken)
    {
        var musicPlayer = await RequirePlayerAsync(player, cancellationToken);
        var track = await RequireTrackAsync(musicPlayer, trackId, cancellationToken);

        return PacketRange.Apply(OpenFile(musicPlayer, track.FileName), range, _streaming.PacketBytes);
    }

    public async Task<ServiceResultDto<MusicTracksDto>> UploadAsync(string player, string? password, List<UploadedFileDto> files, CancellationToken cancellationToken)
    {
        var musicPlayer = await RequirePlayerAsync(player, cancellationToken);
        _accessService.VerifyEditPassword(musicPlayer, password);

        if (files.Count == 0)
            throw new BusinessException(MessageCodes.MusicNoFiles, 400);

        var uploads = files.Select(f => new UploadedFileDto { FileName = SafeFileName(f.FileName), Content = f.Content }).ToList();
        var invalid = uploads.FirstOrDefault(f => !IsAudio(f.FileName) && !IsCover(f.FileName));

        if (invalid is not null)
            throw new BusinessException(MessageCodes.MusicFileTypeInvalid, 400, Path.GetExtension(invalid.FileName));

        var existing = await _musicRepository.GetTracksAsync(musicPlayer.Id, cancellationToken);
        var known = existing.Select(t => t.FileName).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var covers = uploads.Where(f => IsCover(f.FileName)).ToList();
        var added = new List<MusicTrack>();
        var order = existing.Count == 0 ? 0 : existing.Max(t => t.SortOrder);

        foreach (var audio in uploads.Where(f => IsAudio(f.FileName) && !known.Contains(f.FileName)))
        {
            await _fileStore.SaveAsync(musicPlayer.FolderName, audio.FileName, audio.Content, cancellationToken);
            var cover = covers.FirstOrDefault(c => string.Equals(Path.GetFileNameWithoutExtension(c.FileName), Path.GetFileNameWithoutExtension(audio.FileName), StringComparison.OrdinalIgnoreCase));

            if (cover is not null)
                await _fileStore.SaveAsync(musicPlayer.FolderName, cover.FileName, cover.Content, cancellationToken);

            added.Add(new MusicTrack { PlayerId = musicPlayer.Id, Title = TitleOf(audio.FileName), FileName = audio.FileName, CoverFileName = cover?.FileName, SortOrder = ++order, CreatedOn = DateTime.UtcNow });
        }

        await _musicRepository.AddTracksAsync(added, cancellationToken);
        var tracks = await _musicRepository.GetTracksAsync(musicPlayer.Id, cancellationToken);

        return new ServiceResultDto<MusicTracksDto> { Data = ToDto(musicPlayer, tracks), Message = await _messageService.GetAsync(MessageCodes.MusicTracksUploaded, added.Count) };
    }

    #endregion

    #region Private Methods

    private bool IsCover(string fileName)
    {
        return _options.CoverExtensions.Contains(Path.GetExtension(fileName), StringComparer.OrdinalIgnoreCase);
    }

    private bool IsAudio(string fileName)
    {
        return _options.AudioExtensions.Contains(Path.GetExtension(fileName), StringComparer.OrdinalIgnoreCase);
    }

    private static string TitleOf(string fileName)
    {
        var title = Path.GetFileNameWithoutExtension(fileName).Replace('_', ' ');
        title = LeadingNumber.Replace(BitrateTag.Replace(title, string.Empty), string.Empty);
        title = Regex.Replace(title, @"\s{2,}", " ").Trim();

        return title.Length == 0 ? Path.GetFileNameWithoutExtension(fileName) : title;
    }

    private static string SafeFileName(string fileName)
    {
        var name = Path.GetFileName(fileName.Replace('\\', '/'));

        return string.Concat(name.Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c));
    }

    private FileStreamDto OpenFile(MusicPlayer player, string fileName)
    {
        var content = _fileStore.Open(player.FolderName, fileName) ?? throw new BusinessException(MessageCodes.MusicFileMissing, 404);
        ContentTypes.TryGetContentType(fileName, out var contentType);

        return new FileStreamDto { Content = content, ContentType = contentType ?? "application/octet-stream" };
    }

    private static MusicTracksDto ToDto(MusicPlayer player, List<MusicTrack> tracks)
    {
        var root = $"/music/{player.Code}/tracks";

        return new MusicTracksDto { Tracks = tracks.Select(t => new MusicTrackDto { Id = t.Id, Title = t.Title, Artist = t.Artist, AudioUrl = $"{root}/{t.Id}/audio", CoverUrl = t.CoverFileName is null ? null : $"{root}/{t.Id}/cover" }).ToList() };
    }

    private async Task<MusicPlayer> RequirePlayerAsync(string code, CancellationToken cancellationToken)
    {
        return await _musicRepository.GetPlayerAsync(code.ToLowerInvariant(), cancellationToken) ?? throw new BusinessException(MessageCodes.MusicPlayerNotFound, 404);
    }

    private async Task<MusicTrack> RequireTrackAsync(MusicPlayer player, int trackId, CancellationToken cancellationToken)
    {
        return await _musicRepository.GetTrackAsync(player.Id, trackId, cancellationToken) ?? throw new BusinessException(MessageCodes.MusicTrackNotFound, 404);
    }

    #endregion
}
