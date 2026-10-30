namespace Thakurg.Contracts.Khata;

public class TransactionPageDto
{
    public int Page { get; set; }

    public int Total { get; set; }

    public int PageSize { get; set; }

    public long BalanceMinor { get; set; }

    public List<TransactionDto> Items { get; set; } = [];
}
