namespace Thakurg.Contracts.Music;

public class UploadedFileDto
{
    public Stream Content { get; set; } = Stream.Null;

    public string FileName { get; set; } = string.Empty;
}
