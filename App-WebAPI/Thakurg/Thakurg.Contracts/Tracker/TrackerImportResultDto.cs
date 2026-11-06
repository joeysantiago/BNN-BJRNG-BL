namespace Thakurg.Contracts.Tracker;

// What one import batch gave: new transactions, ones caught as duplicates, messages ignored (OTP, offers, failed, no amount) and ones imported before.
public class TrackerImportResultDto
{
    public int Already { get; set; }

    public int Created { get; set; }

    public int Skipped { get; set; }

    public int Duplicates { get; set; }
}
