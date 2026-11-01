namespace Thakurg.Contracts.Khata;

public class CurrencyDto
{
    public int Id { get; set; }

    public bool IsIso { get; set; }

    public bool IsCustom { get; set; }

    public byte Decimals { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Symbol { get; set; } = string.Empty;
}
