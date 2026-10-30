namespace Thakurg.Contracts.Khata;

// Claim names in a SnapKhata access token. "pin" is "true" only after the PIN was entered.
public static class KhataClaimTypes
{
    public const string Session = "sid";

    public const string Subject = "sub";

    public const string Unlocked = "pin";
}
