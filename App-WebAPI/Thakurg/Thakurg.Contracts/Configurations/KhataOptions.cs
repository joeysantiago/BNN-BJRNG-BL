namespace Thakurg.Contracts.Configurations;

public class KhataOptions
{
    public const string SectionName = "Khata";

    public KhataJwtOptions Jwt { get; set; } = new();

    public KhataOtpOptions Otp { get; set; } = new();

    public KhataPinOptions Pin { get; set; } = new();

    public KhataCookieOptions RefreshCookie { get; set; } = new();
}
