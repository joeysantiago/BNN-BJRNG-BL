namespace Thakurg.Contracts.Configurations;

public class KhataOtpOptions
{
    public int PerDay { get; set; } = 10;

    public int MaxAttempts { get; set; } = 5;

    public int ExpiryMinutes { get; set; } = 5;

    public int PerTenMinutes { get; set; } = 3;

    public string Sender { get; set; } = "Dev";

    public int CooldownSeconds { get; set; } = 45;

    public string HmacSecret { get; set; } = string.Empty;
}
