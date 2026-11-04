namespace Thakurg.Contracts.Configurations;

// Khata:Pin: the app lock PIN of the installed app. Length = digits in a PIN; MaxAttempts wrong tries in a row lock the PIN for LockMinutes;
// MaxFailures wrong tries in all clear the PIN and log the user out everywhere. A login younger than ResetMinutes may set a new PIN without the old one
// ("Forgot PIN?"). The installed app locks again after LockAfterMinutes in the background.
public class KhataPinOptions
{
    public int Length { get; set; }

    public int LockMinutes { get; set; }

    public int MaxAttempts { get; set; }

    public int MaxFailures { get; set; }

    public int ResetMinutes { get; set; }

    public int LockAfterMinutes { get; set; }
}
