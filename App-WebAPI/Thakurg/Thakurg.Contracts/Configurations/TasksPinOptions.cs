namespace Thakurg.Contracts.Configurations;

// Tasks:Pin. Length digits; MaxAttempts wrong tries in a row lock the PIN for LockMinutes; MaxFailures wrong tries in total clear it and end every login of the account.
// ResetMinutes: a login younger than this may set a new PIN without the old one. RenewSeconds: how often the unlocked time is pushed forward.
public class TasksPinOptions
{
    public int Length { get; set; }

    public int LockMinutes { get; set; }

    public int MaxAttempts { get; set; }

    public int MaxFailures { get; set; }

    public int RenewSeconds { get; set; }

    public int ResetMinutes { get; set; }
}
