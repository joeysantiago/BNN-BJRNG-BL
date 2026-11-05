using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// The App Lock state of one login session (UserSessions) in My Tasks: unlocked until UnlockedUntil. Independent from SnapKhata's lock sessions.
public class TaskLockSession : BaseEntity
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int SessionId { get; set; }

    public DateTime? UnlockedUntil { get; set; }
}
