using TagLib;

namespace Thakurg.Infrastructure.Common;

/// <summary>Reads the title, artist and embedded cover from the tags of an audio file (ID3, MP4, Vorbis, FLAC and so on).</summary>
public static class MusicTags
{
    private const int MaxLength = 200;

    public sealed record Info(string? Title, string? Artist, byte[]? Cover, string? CoverExtension);

    #region Public Methods

    public static Info Read(Stream content, string fileName)
    {
        try
        {
            using var file = TagLib.File.Create(new StreamAbstraction(fileName, content));
            var tag = file.Tag;
            var artist = Clean(string.Join(", ", tag.Performers.Where(p => !string.IsNullOrWhiteSpace(p)))) ?? Clean(string.Join(", ", tag.AlbumArtists.Where(p => !string.IsNullOrWhiteSpace(p))));
            var picture = tag.Pictures.FirstOrDefault(p => p.Data.Count > 0);

            return new Info(Clean(tag.Title), artist, picture?.Data.Data, picture is null ? null : ExtensionOf(picture.MimeType));
        }
        catch (Exception e) when (e is CorruptFileException or UnsupportedFormatException or IOException or NotSupportedException)
        {
            return new Info(null, null, null, null);
        }
    }

    #endregion

    #region Private Methods

    private static string? Clean(string? value)
    {
        var text = value?.Trim();

        if (string.IsNullOrEmpty(text))
            return null;

        return text.Length > MaxLength ? text[..MaxLength] : text;
    }

    private static string ExtensionOf(string? mimeType)
    {
        return mimeType?.ToLowerInvariant() switch
        {
            "image/png" => ".png",
            "image/webp" => ".webp",
            _ => ".jpg",
        };
    }

    #endregion

    private sealed class StreamAbstraction : TagLib.File.IFileAbstraction
    {
        public string Name { get; }

        private readonly Stream _stream;

        public Stream ReadStream => _stream;

        public Stream WriteStream => throw new NotSupportedException();

        public StreamAbstraction(string name, Stream stream)
        {
            Name = name;
            _stream = stream;
        }

        public void CloseStream(Stream stream)
        {
        }
    }
}
