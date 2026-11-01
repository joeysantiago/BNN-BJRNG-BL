namespace Thakurg.Contracts.Configurations;

public class KhataLimitsOptions
{
    public int MaxBooks { get; set; }

    public int PageSize { get; set; }

    public int MaxPageSize { get; set; }

    public long MaxAmountMinor { get; set; }

    public int IdempotencyHours { get; set; }

    public int MaxContactsPerBook { get; set; }

    public int MaxCustomCurrencies { get; set; }
}
