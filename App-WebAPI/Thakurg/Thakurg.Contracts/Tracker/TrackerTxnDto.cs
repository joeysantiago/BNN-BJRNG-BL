namespace Thakurg.Contracts.Tracker;

// One transaction. Amount is in rupees; the UI builds the description from these fields in the user's language.
public class TrackerTxnDto
{
    public int Id { get; set; }

    public int? DupOf { get; set; }

    public int? LoanId { get; set; }

    public int? PairId { get; set; }

    public int? AccountId { get; set; }

    public bool FlowEdited { get; set; }

    public DateTime At { get; set; }

    public bool Edited { get; set; }

    public string? Ref { get; set; }

    public string? Kind { get; set; }

    public decimal Amount { get; set; }

    public int Confidence { get; set; }

    public string? DupWhy { get; set; }

    public string? Account { get; set; }

    public bool TypeGuessed { get; set; }

    public string? Merchant { get; set; }

    public DateTime CreatedAt { get; set; }

    public TrackerSmsDto? Sms { get; set; }

    public string Note { get; set; } = string.Empty;

    public string Flow { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public string Method { get; set; } = string.Empty;

    public string Source { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;
}
