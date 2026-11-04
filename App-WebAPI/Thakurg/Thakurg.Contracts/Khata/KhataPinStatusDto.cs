namespace Thakurg.Contracts.Khata;

// GET api/khata/pin: whether the user has an app lock PIN, how many digits it has, and whether this login may set a new one without the old one.
// Protected = the installed app locks this session; Locked = it is locked now, so every ledger call is refused until the PIN is entered.
public class KhataPinStatusDto
{
    public int Length { get; set; }

    public bool HasPin { get; set; }

    public bool Locked { get; set; }

    public bool CanReset { get; set; }

    public bool Protected { get; set; }

    public DateTime? LockedUntil { get; set; }

    public int LockAfterMinutes { get; set; }
}
