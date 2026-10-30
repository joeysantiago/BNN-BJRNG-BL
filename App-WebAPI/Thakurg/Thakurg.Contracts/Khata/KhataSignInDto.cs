namespace Thakurg.Contracts.Khata;

public class KhataSignInDto
{
    public DateTime RefreshExpiresOn { get; set; }

    public KhataAuthResultDto Auth { get; set; } = new();

    public string RefreshToken { get; set; } = string.Empty;
}
