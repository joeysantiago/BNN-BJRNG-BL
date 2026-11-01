namespace Thakurg.Contracts.Configurations;

public partial class RateLimitOptions
{
    public KhataRateLimitOptions Khata { get; set; } = new();
}
