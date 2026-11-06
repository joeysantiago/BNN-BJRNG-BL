namespace Thakurg.Contracts.Tracker;

// How the money moved (tracker.method.<code> in the UI).
public static class TrackerMethods
{
    public const string Atm = "atm";

    public const string Upi = "upi";

    public const string Bank = "bank";

    public const string Card = "card";

    public const string Cash = "cash";

    public const string Imps = "imps";

    public const string Neft = "neft";

    public const string Rtgs = "rtgs";

    public const string DebitCard = "debitCard";

    public const string CreditCard = "creditCard";

    public const string NetBanking = "netBanking";

    public static readonly string[] All = [Upi, DebitCard, CreditCard, Card, Neft, Imps, Rtgs, NetBanking, Atm, Bank, Cash];
}
