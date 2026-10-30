namespace Thakurg.Contracts.Khata;

// Authentication scheme and authorization policies: Session = logged in, Unlocked = logged in and PIN entered.
public static class KhataPolicies
{
    public const string Scheme = "Khata";

    public const string Session = "KhataSession";

    public const string Unlocked = "KhataUnlocked";
}
