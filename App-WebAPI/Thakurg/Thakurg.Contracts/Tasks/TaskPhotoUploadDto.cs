namespace Thakurg.Contracts.Tasks;

// One uploaded picture, handed from the controller to the service.
public class TaskPhotoUploadDto
{
    public long Length { get; set; }

    public Stream Content { get; set; } = Stream.Null;

    public string FileName { get; set; } = string.Empty;
}
