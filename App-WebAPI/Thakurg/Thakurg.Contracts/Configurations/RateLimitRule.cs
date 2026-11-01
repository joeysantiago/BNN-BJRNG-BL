namespace Thakurg.Contracts.Configurations;

public class RateLimitRule
{
    public int Burst { get; set; }

    public int Permit { get; set; }

    public int WindowSeconds { get; set; }
}
