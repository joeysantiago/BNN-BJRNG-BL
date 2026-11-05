namespace Thakurg.Contracts.Export;

// A table to export as PDF, CSV or Excel: title and subtitle lines, columns, rows of cell values (one per column, null = empty) and an optional totals row.
// FileName is the download name without extension; RightToLeft lays the PDF and the sheet out right-to-left (Arabic).
public class ExportTable
{
    public bool RightToLeft { get; set; }

    public int MoneyDecimals { get; set; }

    public List<object?> Totals { get; set; } = [];

    public List<string> Subtitles { get; set; } = [];

    public string Title { get; set; } = string.Empty;

    public List<List<object?>> Rows { get; set; } = [];

    public string FileName { get; set; } = string.Empty;

    public List<ExportColumn> Columns { get; set; } = [];
}
