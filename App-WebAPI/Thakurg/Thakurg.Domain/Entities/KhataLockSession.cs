using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// A login session (UserSessions) that the installed app protects with the app lock PIN. While UnlockedUntil has passed (or is null),
// every SnapKhata ledger call of that session is refused with KhataPinRequired until the PIN is entered again.
public class KhataLockSession : BaseEntity
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int SessionId { get; set; }

    public DateTime? UnlockedUntil { get; set; }
}
