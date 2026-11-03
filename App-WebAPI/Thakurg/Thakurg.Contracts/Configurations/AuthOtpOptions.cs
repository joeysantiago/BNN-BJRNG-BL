namespace Thakurg.Contracts.Configurations;

// Auth:Otp in appsettings.json: login with a one-time code. Apps = the apps that offer it (and the only apps such a session opens); the code length, how long it works,
// how many wrong tries it allows, the wait before a new code, how many codes one address may get per DestinationWindowMinutes, and the e-mail domain given to accounts made from a mobile number.
public class AuthOtpOptions
{
    public int CodeLength { get; set; }

    public int CodeMinutes { get; set; }

    public int MaxAttempts { get; set; }

    public int ResendSeconds { get; set; }

    public int MaxPerDestination { get; set; }

    public List<string> Apps { get; set; } = [];

    public int DestinationWindowMinutes { get; set; }

    public string PhoneEmailDomain { get; set; } = string.Empty;
}
