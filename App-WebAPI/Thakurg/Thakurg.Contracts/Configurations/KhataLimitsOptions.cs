namespace Thakurg.Contracts.Configurations;

public class KhataLimitsOptions
{
    public int MaxBooks { get; set; }

    public int PageSize { get; set; }

    public int NoteLength { get; set; }

    public int MaxPageSize { get; set; }

    public int MaxExportRows { get; set; }

    public int SummaryMonths { get; set; }

    public int SummaryRecent { get; set; }

    public int BookNameLength { get; set; }

    public long MaxPhotoBytes { get; set; }

    public long MaxAmountMinor { get; set; }

    public int IdempotencyHours { get; set; }

    public int ContactNameLength { get; set; }

    public int MaxPhotosPerEntry { get; set; }

    public int MaxContactsPerBook { get; set; }

    public int SummaryTopContacts { get; set; }

    public DateOnly FirstEntryDate { get; set; }

    public int MaxCustomCurrencies { get; set; }

    public int PhotoFileNameLength { get; set; }

    public int ContactAddressLength { get; set; }
}
