namespace Thakurg.Contracts.Khata;

// The code itself is only filled in when Khata:Otp:ReturnCodeInResponse is on, which the API allows in Development only.
public class OtpSendResultDto
{
    public string? DevCode { get; set; }
}
