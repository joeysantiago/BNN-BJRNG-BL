namespace Thakurg.Contracts.Export;

// Text = string, Money = decimal in major units (ExportTable.MoneyDecimals), Date = DateOnly, Number = int / long / decimal.
public enum ExportCellKind : byte
{
    Text = 1,
    Money = 2,
    Date = 3,
    Number = 4
}
