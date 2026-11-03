namespace Thakurg.Infrastructure.Common;

// Picture types are taken from a file's first bytes, never from its name or the request header. A stored file keeps the extension of its real type,
// so its content type can be told from its FileId when it is served.
public static class KhataImageType
{
    private const string Unknown = "application/octet-stream";

    public static readonly IReadOnlyDictionary<string, string> Extensions = new Dictionary<string, string> { ["image/jpeg"] = ".jpg", ["image/png"] = ".png", ["image/webp"] = ".webp", ["image/gif"] = ".gif" };

    #region Public Methods

    // JPG starts FF D8 FF, PNG 89 50 4E 47 0D 0A 1A 0A, GIF "GIF87a" / "GIF89a", WebP "RIFF" .... "WEBP".
    public static string? Detect(byte[] head)
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

    public static string FromFileId(string fileId)
    {
        return Extensions.FirstOrDefault(e => fileId.EndsWith(e.Value, StringComparison.OrdinalIgnoreCase)).Key ?? Unknown;
    }

    #endregion
}
