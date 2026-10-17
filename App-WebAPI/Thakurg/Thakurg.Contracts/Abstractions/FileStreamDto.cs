namespace Thakurg.Contracts.Abstractions;

public class FileStreamDto
{
    public bool IsPartial { get; set; }

    public long? RangeEnd { get; set; }

    public long? RangeStart { get; set; }

    public string? FileName { get; set; }

    public long? TotalLength { get; set; }

    public bool IsUnsatisfiable { get; set; }

    public Stream Content { get; set; } = Stream.Null;

    public string ContentType { get; set; } = "application/octet-stream";
}
