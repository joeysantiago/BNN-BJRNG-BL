namespace Thakurg.Contracts.Khata;

// Query string of the entry lists (?page=&pageSize=&kind=&from=&to=&q=&sort=). Missing values fall back to the service's choices.
public class TransactionQueryDto
{
    public int? Page { get; set; }

    public string? Q { get; set; }

    public string? To { get; set; }

    public string? From { get; set; }

    public string? Kind { get; set; }

    public string? Sort { get; set; }

    public int? PageSize { get; set; }
}
