namespace Thakurg.Contracts.Khata;

public class BookDto
{
    public int Id { get; set; }

    public bool HasEntries { get; set; }

    public int ContactCount { get; set; }

    public bool IsLastOpened { get; set; }

    public long YouWillGetMinor { get; set; }

    public long YouWillGiveMinor { get; set; }

    public string Name { get; set; } = string.Empty;

    public CurrencyDto Currency { get; set; } = new();
}
