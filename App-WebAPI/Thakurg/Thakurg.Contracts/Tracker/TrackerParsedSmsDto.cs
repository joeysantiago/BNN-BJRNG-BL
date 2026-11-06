namespace Thakurg.Contracts.Tracker;

// What the SMS reader found in one message before a transaction is made (TrackerSmsReader). Type is debit, credit or null when unclear.
public class TrackerParsedSmsDto
{
    public bool Known { get; set; }

    public DateTime At { get; set; }

    public bool Person { get; set; }

    public string? Ref { get; set; }

    public string? Type { get; set; }

    public bool IsRefund { get; set; }

    public bool Ambiguous { get; set; }

    public bool DateFound { get; set; }

    public decimal Amount { get; set; }

    public string? Account { get; set; }

    public string? RefText { get; set; }

    public string? Merchant { get; set; }

    public string? AmountText { get; set; }

    public string? AccountText { get; set; }

    public string? MerchantRaw { get; set; }

    public string? MerchantKind { get; set; }

    public string? MerchantCategory { get; set; }

    public string Method { get; set; } = string.Empty;
}
