namespace Thakurg.Contracts.Configurations;

public class AuthRateLimitOptions
{
    public RateLimitRule Login { get; set; } = new();

    public RateLimitRule Refresh { get; set; } = new();
}
