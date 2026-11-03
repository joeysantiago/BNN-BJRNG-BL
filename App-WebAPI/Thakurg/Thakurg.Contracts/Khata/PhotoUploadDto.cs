namespace Thakurg.Contracts.Khata;

// One uploaded bill photo as the controller received it; the service checks its size and its first bytes.
public class PhotoUploadDto
{
    public long Length { get; set; }

    public required Stream Content { get; set; }

    public string FileName { get; set; } = string.Empty;
}
