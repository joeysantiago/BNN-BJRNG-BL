namespace Thakurg.Contracts.Configurations;

public class RateLimitRule
{
    public int Permit { get; set; }

    public int WindowSeconds { get; set; }
}
