namespace Thakurg.Contracts.Khata;

public class CurrencyRequestDto
{
    public byte Decimals { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Symbol { get; set; } = string.Empty;
}
