namespace Thakurg.Contracts.Khata;

public class KhataCallerDto
{
    public int UserId { get; set; }

    public string? Ip { get; set; }

    public int SessionId { get; set; }

    public string? DeviceId { get; set; }

    public string? UserAgent { get; set; }
}
