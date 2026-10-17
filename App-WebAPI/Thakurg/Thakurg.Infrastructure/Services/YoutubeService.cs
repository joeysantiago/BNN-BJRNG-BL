using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Thakurg.Application.Services;
using Thakurg.Contracts.Abstractions;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.YouTube;
using Thakurg.Infrastructure.Common;
using YoutubeExplode;
using YoutubeExplode.Common;
using YoutubeExplode.Exceptions;
using YoutubeExplode.Videos.Streams;

namespace Thakurg.Infrastructure.Services;

public class YoutubeService : IYoutubeService
{
    private readonly IMemoryCache _cache;

    private readonly YoutubeClient _youtube;

    private readonly YoutubeOptions _options;

    private readonly StreamingOptions _streaming;

    private static readonly Regex VideoIdPattern = new(@"^[\w-]{11}$", RegexOptions.Compiled);

    private static readonly Regex ListIdPattern = new(@"^[\w-]{10,64}$", RegexOptions.Compiled);

    public YoutubeService(IMemoryCache cache, YoutubeClient youtube, IOptions<YoutubeOptions> options, IOptions<StreamingOptions> streaming)
    {
        _cache = cache;
        _youtube = youtube;
        _options = options.Value;
        _streaming = streaming.Value;
    }

    #region Public Methods

    public async Task<FileStreamDto> OpenMp3Async(string videoId, CancellationToken cancellationToken)
    {
        var video = await GetVideoAsync(videoId, cancellationToken);
        var source = (await OpenSourceAsync(videoId, cancellationToken)).Content;
        var process = StartFfmpeg(video, source);

        return new FileStreamDto { Content = new ProcessOutputStream(process, source), ContentType = "audio/mpeg", FileName = $"{SafeName(video.Title, videoId)}.mp3" };
    }

    public async Task<YoutubeVideoDto> GetVideoAsync(string videoId, CancellationToken cancellationToken)
    {
        if (!VideoIdPattern.IsMatch(videoId))
            throw new BusinessException(MessageCodes.YoutubeVideoIdInvalid, 400);

        var video = await GuardAsync(() => _youtube.Videos.GetAsync(videoId, cancellationToken).AsTask());

        return ToDto(videoId, video.Title, video.Author.ChannelTitle, video.Duration);
    }

    public async Task<List<YoutubeVideoDto>> SearchAsync(string? query, CancellationToken cancellationToken)
    {
        var text = query?.Trim() ?? string.Empty;

        if (text.Length == 0)
            throw new BusinessException(MessageCodes.YoutubeQueryRequired, 400);

        var results = await GuardAsync(async () => await _youtube.Search.GetVideosAsync(text[..Math.Min(text.Length, 200)], cancellationToken).CollectAsync(_options.MaxResults));

        return results.Select(v => ToDto(v.Id.Value, v.Title, v.Author.ChannelTitle, v.Duration)).ToList();
    }

    public async Task<List<YoutubeVideoDto>> GetPlaylistAsync(string listId, CancellationToken cancellationToken)
    {
        if (!ListIdPattern.IsMatch(listId))
            throw new BusinessException(MessageCodes.YoutubePlaylistIdInvalid, 400);

        var items = await GuardAsync(async () => await _youtube.Playlists.GetVideosAsync(listId, cancellationToken).CollectAsync(200));

        return items.Select(v => ToDto(v.Id.Value, v.Title, v.Author.ChannelTitle, v.Duration)).ToList();
    }

    public async Task<FileStreamDto> OpenAudioAsync(string videoId, string? range, CancellationToken cancellationToken)
    {
        return PacketRange.Apply(await OpenSourceAsync(videoId, cancellationToken), range, _streaming.PacketBytes);
    }

    #endregion

    #region Private Methods

    private static string SafeName(string title, string fallback)
    {
        var name = Regex.Replace(title, @"[^\w\s.-]", string.Empty).Trim();

        return name.Length == 0 ? fallback : name[..Math.Min(name.Length, 80)];
    }

    private static async Task<T> GuardAsync<T>(Func<Task<T>> action)
    {
        try
        {
            return await action();
        }
        catch (Exception ex) when (ex is YoutubeExplodeException or HttpRequestException)
        {
            throw new BusinessException(MessageCodes.YoutubeLookupFailed, 502);
        }
    }

    private Process StartFfmpeg(YoutubeVideoDto video, Stream source)
    {
        var startInfo = new ProcessStartInfo(_options.FfmpegPath) { RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false, CreateNoWindow = true };

        foreach (var argument in new[] { "-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-vn", "-codec:a", "libmp3lame", "-b:a", "320k", "-metadata", $"title={video.Title}", "-metadata", $"artist={video.Artist}", "-f", "mp3", "pipe:1" })
            startInfo.ArgumentList.Add(argument);

        try
        {
            return Process.Start(startInfo) ?? throw new BusinessException(MessageCodes.YoutubeFfmpegMissing, 503);
        }
        catch (System.ComponentModel.Win32Exception)
        {
            source.Dispose();

            throw new BusinessException(MessageCodes.YoutubeFfmpegMissing, 503);
        }
    }

    private static YoutubeVideoDto ToDto(string id, string title, string artist, TimeSpan? duration)
    {
        return new YoutubeVideoDto { Id = id, Title = title, Artist = artist, Duration = (int)(duration?.TotalSeconds ?? 0), Thumb = $"https://i.ytimg.com/vi/{id}/mqdefault.jpg" };
    }

    private async Task<FileStreamDto> OpenSourceAsync(string videoId, CancellationToken cancellationToken)
    {
        var info = await GetAudioInfoAsync(videoId, cancellationToken);
        var content = await GuardAsync(() => _youtube.Videos.Streams.GetAsync(info, cancellationToken).AsTask());

        return new FileStreamDto { Content = content, ContentType = info.Container == Container.Mp4 ? "audio/mp4" : "audio/webm" };
    }

    private async Task<AudioOnlyStreamInfo> GetAudioInfoAsync(string videoId, CancellationToken cancellationToken)
    {
        if (!VideoIdPattern.IsMatch(videoId))
            throw new BusinessException(MessageCodes.YoutubeVideoIdInvalid, 400);

        if (_cache.TryGetValue(videoId, out AudioOnlyStreamInfo? cached) && cached is not null)
            return cached;

        var manifest = await GuardAsync(() => _youtube.Videos.Streams.GetManifestAsync(videoId, cancellationToken).AsTask());
        var audio = manifest.GetAudioOnlyStreams().ToList();
        var mp4 = audio.Where(s => s.Container == Container.Mp4).ToList();

        if (audio.Count == 0)
            throw new BusinessException(MessageCodes.YoutubeNoAudio, 404);

        var best = (AudioOnlyStreamInfo)(mp4.Count > 0 ? mp4 : audio).GetWithHighestBitrate();
        _cache.Set(videoId, best, TimeSpan.FromMinutes(_options.StreamCacheMinutes));

        return best;
    }

    #endregion
}
