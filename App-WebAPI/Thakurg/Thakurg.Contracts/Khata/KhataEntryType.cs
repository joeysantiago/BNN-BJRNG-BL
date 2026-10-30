namespace Thakurg.Contracts.Khata;

// Gave = credit given (balance goes up, you will get); Got = payment received (balance goes down).
public enum KhataEntryType : byte
{
    Gave = 1,
    Got = 2
}
