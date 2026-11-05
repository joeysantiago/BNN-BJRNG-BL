namespace Thakurg.Contracts.Tasks;

// The App Lock of this login session: HasPin = the lock is on; Locked = the PIN must be entered before any task call; CanReset = the login is fresh enough to set a new PIN without the old one.
public class TaskPinStatusDto
{
    public int Length { get; set; }

    public bool HasPin { get; set; }

    public bool Locked { get; set; }

    public bool CanReset { get; set; }

    public int LockAfterMinutes { get; set; }

    public DateTime? LockedUntil { get; set; }
}
