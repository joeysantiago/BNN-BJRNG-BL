namespace Thakurg.Contracts.Configurations;

public class KhataOtpOptions
{
    public int PerDay { get; set; }

    public int MaxAttempts { get; set; }

    public int ExpiryMinutes { get; set; }

    public int PerTenMinutes { get; set; }

    public int CooldownSeconds { get; set; }

    public bool ReturnCodeInResponse { get; set; }

    public string Sender { get; set; } = string.Empty;

    public string HmacSecret { get; set; } = string.Empty;
}
