namespace Thakurg.Contracts.Configurations;

// The limits of SnapTracker (Tracker:Limits): field lengths, the duplicate window, the alerts kept and the auto-approve range. PairHours: how far apart
// the two sides of a self transfer may be; CardBillDays: a card bill paid and the card's "payment received"; EmiTolerancePercent: how close a debit must be
// to a loan's EMI; UnnamedSelfMinor: a credit naming nobody from this amount (paise) up is the user's own money; OwnEntries and OwnNameLength: the names
// and mobiles the user may give.
public class TrackerLimitsOptions
{
    public int PairHours { get; set; }

    public int MaxAlerts { get; set; }

    public int OwnEntries { get; set; }

    public int NoteLength { get; set; }

    public int CardBillDays { get; set; }

    public int MaxSmsLength { get; set; }

    public int OwnNameLength { get; set; }

    public int MaxImportBatch { get; set; }

    public int MerchantLength { get; set; }

    public long MaxAmountMinor { get; set; }

    public long UnnamedSelfMinor { get; set; }

    public int DuplicateMinutes { get; set; }

    public int EmiTolerancePercent { get; set; }

    public int MaxAutoApprovePercent { get; set; }

    public int MinAutoApprovePercent { get; set; }
}
