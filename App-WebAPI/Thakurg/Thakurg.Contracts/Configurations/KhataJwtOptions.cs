namespace Thakurg.Contracts.Configurations;

public class KhataJwtOptions
{
    public int RefreshDays { get; set; } = 30;

    public int AccessMinutes { get; set; } = 15;

    public string Secret { get; set; } = string.Empty;

    public string Issuer { get; set; } = "thakurg-local";
}
