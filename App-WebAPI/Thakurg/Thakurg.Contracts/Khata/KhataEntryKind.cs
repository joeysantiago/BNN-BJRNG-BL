namespace Thakurg.Contracts.Khata;

// Which entries a list shows. Live (not soft-deleted) is used by the book summary only; the query string accepts the other five.
public enum KhataEntryKind : byte
{
    All = 0,
    Gave = 1,
    Got = 2,
    Photos = 3,
    Deleted = 4,
    Live = 5
}
