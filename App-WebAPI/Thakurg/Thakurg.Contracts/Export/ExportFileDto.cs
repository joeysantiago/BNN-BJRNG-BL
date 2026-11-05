namespace Thakurg.Contracts.Export;

// An exported file: its bytes, media type and download name (with extension).
public class ExportFileDto
{
    public byte[] Content { get; set; } = [];

    public string FileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;
}
