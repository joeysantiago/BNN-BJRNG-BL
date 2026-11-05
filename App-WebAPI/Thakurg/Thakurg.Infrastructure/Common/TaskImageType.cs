namespace Thakurg.Infrastructure.Common;

// The type of an uploaded picture, read from its first bytes (the file name is not trusted): JPEG FF D8 FF, PNG 89 50 4E 47, GIF "GIF8", WebP "RIFF....WEBP".
public static class TaskImageType
{
    public static readonly Dictionary<string, string> Extensions = new() { ["image/jpeg"] = ".jpg", ["image/png"] = ".png", ["image/gif"] = ".gif", ["image/webp"] = ".webp" };

    #region Public Methods

    public static string? Detect(byte[] head)
    {
        return head switch
        {
            [0xFF, 0xD8, 0xFF, ..] => "image/jpeg",
            [0x89, 0x50, 0x4E, 0x47, ..] => "image/png",
            [0x47, 0x49, 0x46, 0x38, ..] => "image/gif",
            [0x52, 0x49, 0x46, 0x46, _, _, _, _, 0x57, 0x45, 0x42, 0x50, ..] => "image/webp",
            _ => null
        };
    }

    #endregion
}
