namespace Thakurg.Contracts.Configurations;

public class AuthJwtOptions
{
    public int RefreshDays { get; set; }

    public int AccessMinutes { get; set; }

    public string Issuer { get; set; } = string.Empty;

    public string Secret { get; set; } = string.Empty;
}
