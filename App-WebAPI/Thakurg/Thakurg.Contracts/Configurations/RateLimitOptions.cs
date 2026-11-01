namespace Thakurg.Contracts.Configurations;

public partial class RateLimitOptions
{
    public int WindowSeconds { get; set; }

    public int GlobalPermitLimit { get; set; }

    public int StreamPermitLimit { get; set; }

    public int SensitivePermitLimit { get; set; }

    public const string SectionName = "RateLimiting";

    public AuthRateLimitOptions Auth { get; set; } = new();
}
