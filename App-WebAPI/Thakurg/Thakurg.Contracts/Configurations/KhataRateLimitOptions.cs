namespace Thakurg.Contracts.Configurations;

public class KhataRateLimitOptions
{
    public RateLimitRule Read { get; set; } = new();

    public RateLimitRule Write { get; set; } = new();
}
