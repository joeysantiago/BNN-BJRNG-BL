namespace Thakurg.Contracts.Khata;

public class OtpVerifyRequestDto
{
    public string Code { get; set; } = string.Empty;

    public string Identifier { get; set; } = string.Empty;
}
