namespace Thakurg.Contracts.Configurations;

public class AuthRateLimitOptions
{
    public RateLimitRule Otp { get; set; } = new();

    public RateLimitRule Login { get; set; } = new();

    public RateLimitRule Refresh { get; set; } = new();
}
