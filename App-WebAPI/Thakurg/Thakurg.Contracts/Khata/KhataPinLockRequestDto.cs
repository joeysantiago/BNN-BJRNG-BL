namespace Thakurg.Contracts.Khata;

// POST api/khata/pin/lock: the installed app has opened. KeepOpen = the user has just logged in with a password or a code, so the app stays unlocked.
public class KhataPinLockRequestDto
{
    public bool KeepOpen { get; set; }
}
