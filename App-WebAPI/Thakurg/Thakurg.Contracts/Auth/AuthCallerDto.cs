namespace Thakurg.Contracts.Auth;

public class AuthCallerDto
{
    public int UserId { get; set; }

    public string? Ip { get; set; }

    public int SessionId { get; set; }

    public string? DeviceId { get; set; }

    public string? RoleCode { get; set; }

    public string? UserAgent { get; set; }

    public string? LoginMethod { get; set; }
}
