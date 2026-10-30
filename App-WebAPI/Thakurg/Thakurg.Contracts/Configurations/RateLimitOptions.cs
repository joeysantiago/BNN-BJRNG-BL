namespace Thakurg.Contracts.Configurations;

public class RateLimitOptions
{
    public int WindowSeconds { get; set; }

    public int GlobalPermitLimit { get; set; }

    public int StreamPermitLimit { get; set; }

    public int SensitivePermitLimit { get; set; }

    public const string SectionName = "RateLimiting";

    public KhataRateLimitOptions Khata { get; set; } = new();
}
