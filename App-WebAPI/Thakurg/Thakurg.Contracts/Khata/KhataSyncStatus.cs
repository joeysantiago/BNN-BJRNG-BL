namespace Thakurg.Contracts.Khata;

public enum KhataSyncStatus : byte
{
    Pending = 0,
    Synced = 1,
    Failed = 2,
    Moving = 3,
    Moved = 4
}
