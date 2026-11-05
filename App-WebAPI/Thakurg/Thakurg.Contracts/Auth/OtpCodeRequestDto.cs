namespace Thakurg.Contracts.Auth;

// POST api/auth/otp/request: channel "email" or "sms", the e-mail address or mobile number, and the app the user is logging in to (Auth:Otp:Apps).
public class OtpCodeRequestDto
{
    public string App { get; set; } = string.Empty;

    public string Channel { get; set; } = string.Empty;

    public string Destination { get; set; } = string.Empty;
}
