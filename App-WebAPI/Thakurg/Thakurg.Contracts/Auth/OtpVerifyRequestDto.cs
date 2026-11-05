namespace Thakurg.Contracts.Auth;

// POST api/auth/otp/verify: the same channel, destination and app as the request, plus the code that was sent.
public class OtpVerifyRequestDto
{
    public string App { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string Channel { get; set; } = string.Empty;

    public string Destination { get; set; } = string.Empty;
}
