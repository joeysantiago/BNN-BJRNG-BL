namespace Thakurg.Contracts.Configurations;

public class RateLimitRule
{
    public int Permit { get; set; } = 10;

    public int WindowSeconds { get; set; } = 60;
}
