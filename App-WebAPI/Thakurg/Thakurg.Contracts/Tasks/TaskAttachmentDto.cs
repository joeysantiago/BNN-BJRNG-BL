namespace Thakurg.Contracts.Tasks;

public class TaskAttachmentDto
{
    public int Id { get; set; }

    public long SizeBytes { get; set; }

    public string FileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;
}
