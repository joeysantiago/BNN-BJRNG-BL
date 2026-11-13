namespace Thakurg.Contracts.Tracker;

// What a transaction counts towards (tracker.flow.<code> in the UI). Spend, card spend and EMI are spending; salary and income are income; a card bill paid
// leaves the bank but is not spending (the card's purchases already were); the card's "payment received", self transfers and money borrowed count nowhere.
public static class TrackerFlows
{
    public const string Emi = "emi";

    public const string Spend = "spend";

    public const string Income = "income";

    public const string LoanIn = "loanIn";

    public const string Refund = "refund";

    public const string Salary = "salary";

    public const string CardSpend = "cardSpend";

    public const string CardRefund = "cardRefund";

    public const string CardBillPaid = "cardBillPaid";

    public const string SelfTransfer = "selfTransfer";

    public const string CardPaymentIn = "cardPaymentIn";

    public static readonly string[] All = [Spend, CardSpend, Emi, CardBillPaid, Salary, Income, Refund, CardRefund, LoanIn, SelfTransfer, CardPaymentIn];
}
