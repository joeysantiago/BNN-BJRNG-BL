namespace Thakurg.Contracts.Configurations;

// The limits of SnapTracker (Tracker:Limits): field lengths, the duplicate window, the alerts kept and the auto-approve range.
public class TrackerLimitsOptions
{
    public int MaxAlerts { get; set; }

    public int NoteLength { get; set; }

    public int MaxSmsLength { get; set; }

    public int MaxImportBatch { get; set; }

    public int MerchantLength { get; set; }

    public long MaxAmountMinor { get; set; }

    public int DuplicateMinutes { get; set; }

    public int MaxAutoApprovePercent { get; set; }

    public int MinAutoApprovePercent { get; set; }
}
