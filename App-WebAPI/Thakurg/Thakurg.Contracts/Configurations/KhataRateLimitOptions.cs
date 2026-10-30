namespace Thakurg.Contracts.Configurations;

public class KhataRateLimitOptions
{
    public RateLimitRule Pin { get; set; } = new() { Permit = 10, WindowSeconds = 60 };

    public RateLimitRule OtpSend { get; set; } = new() { Permit = 5, WindowSeconds = 600 };

    public RateLimitRule Refresh { get; set; } = new() { Permit = 30, WindowSeconds = 60 };

    public RateLimitRule OtpVerify { get; set; } = new() { Permit = 10, WindowSeconds = 600 };
}
