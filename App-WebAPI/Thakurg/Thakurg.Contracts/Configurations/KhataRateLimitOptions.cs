namespace Thakurg.Contracts.Configurations;

public class KhataRateLimitOptions
{
    public RateLimitRule Pin { get; set; } = new();

    public RateLimitRule OtpSend { get; set; } = new();

    public RateLimitRule Refresh { get; set; } = new();

    public RateLimitRule OtpVerify { get; set; } = new();
}
