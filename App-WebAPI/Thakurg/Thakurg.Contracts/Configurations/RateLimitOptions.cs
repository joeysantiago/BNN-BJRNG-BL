namespace Thakurg.Contracts.Configurations;

public class RateLimitOptions
{
    public int WindowSeconds { get; set; } = 60;

    public int StreamPermitLimit { get; set; } = 30;

    public const string SectionName = "RateLimiting";

    public int GlobalPermitLimit { get; set; } = 600;

    public int SensitivePermitLimit { get; set; } = 10;
}
