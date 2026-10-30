namespace Thakurg.Contracts.Khata;

// What a PIN attempt was for (KhataPinAttempts.Purpose).
public enum KhataPinCheck : byte
{
    Unlock = 1,
    Proof = 2,
    Set = 3
}
