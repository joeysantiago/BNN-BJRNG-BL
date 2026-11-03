using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Thakurg.Application.Services;
using Thakurg.Contracts.Export;

namespace Thakurg.Infrastructure.Export;

// Any table as PDF (QuestPDF, Community license), Excel (ClosedXML) or CSV (UTF-8 with BOM, so Excel reads Hindi and Arabic).
// The PDF embeds Noto Sans with its Devanagari and Arabic families (Export/Fonts, OFL), so Hindi and Arabic text is drawn and shaped; RightToLeft mirrors the page.
public class ExportService : IExportService
{
    private const int MaxSheetNameLength = 31;

    private const string CsvType = "text/csv";

    private const string DateFormat = "dd-MM-yyyy";

    private const string PdfType = "application/pdf";

    private const string ExcelDateFormat = "dd-mm-yyyy";

    private static readonly Lazy<bool> PdfSetup = new(SetUpPdf);

    private static readonly string[] Fonts = ["Noto Sans", "Noto Sans Devanagari", "Noto Sans Arabic"];

    private const string XlsxType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    #region Public Methods

    public ExportFileDto Export(ExportTable table, ExportFormat format)
    {
        return format switch
        {
            ExportFormat.Pdf => new ExportFileDto { Content = Pdf(table), ContentType = PdfType, FileName = table.FileName + ".pdf" },
            ExportFormat.Xlsx => new ExportFileDto { Content = Xlsx(table), ContentType = XlsxType, FileName = table.FileName + ".xlsx" },
            _ => new ExportFileDto { Content = Csv(table), ContentType = CsvType, FileName = table.FileName + ".csv" }
        };
    }

    #endregion

    #region Private Methods

    private static bool SetUpPdf()
    {
        QuestPDF.Settings.License = LicenseType.Community;
        var assembly = typeof(ExportService).Assembly;

        foreach (var name in assembly.GetManifestResourceNames().Where(n => n.EndsWith(".ttf", StringComparison.OrdinalIgnoreCase)))
        {
            using var font = assembly.GetManifestResourceStream(name)!;
            QuestPDF.Drawing.FontManager.RegisterFontFromStream(font);
        }

        return true;
    }

    private static byte[] Csv(ExportTable table)
    {
        var csv = new StringBuilder();
        CsvLine(csv, table.Columns.Select(c => c.Header));

        foreach (var row in table.Rows)
            CsvLine(csv, table.Columns.Select((column, i) => CsvCell(row.ElementAtOrDefault(i), column, table)));

        if (table.Totals.Count > 0)
            CsvLine(csv, table.Columns.Select((column, i) => CsvCell(table.Totals.ElementAtOrDefault(i), column, table)));

        return [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(csv.ToString())];
    }

    private static byte[] Pdf(ExportTable table)
    {
        _ = PdfSetup.Value;

        return Document.Create(document => document.Page(page =>
        {
            page.Size(PageSizes.A4.Landscape());
            page.Margin(24);
            page.DefaultTextStyle(style => style.FontFamily(Fonts).FontSize(9));

            if (table.RightToLeft)
                page.ContentFromRightToLeft();

            page.Header().Column(column =>
            {
                column.Item().Text(table.Title).FontSize(14).Bold();

                foreach (var line in table.Subtitles)
                    column.Item().Text(line).FontColor(Colors.Grey.Darken2);
            });
            page.Content().PaddingTop(8).Table(grid => PdfTable(grid, table));
            page.Footer().AlignCenter().Text(text =>
            {
                text.CurrentPageNumber();
                text.Span(" / ");
                text.TotalPages();
            });
        })).GeneratePdf();
    }

    private static byte[] Xlsx(ExportTable table)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add(SheetName(table.Title));
        sheet.RightToLeft = table.RightToLeft;
        sheet.Cell(1, 1).SetValue(table.Title).Style.Font.SetBold().Font.SetFontSize(14);
        var row = 2;

        foreach (var line in table.Subtitles)
            sheet.Cell(row++, 1).SetValue(line);

        var headerRow = ++row;

        for (var i = 0; i < table.Columns.Count; i++)
            sheet.Cell(headerRow, i + 1).SetValue(table.Columns[i].Header).Style.Font.SetBold().Fill.SetBackgroundColor(XLColor.LightGray);

        foreach (var values in table.Rows)
            XlsxRow(sheet.Row(++row), values, table, false);

        if (table.Totals.Count > 0)
            XlsxRow(sheet.Row(++row), table.Totals, table, true);

        sheet.SheetView.FreezeRows(headerRow);
        sheet.Columns(1, table.Columns.Count).AdjustToContents();
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);

        return stream.ToArray();
    }

    // Excel sheet names: at most 31 characters, none of : \ / ? * [ ].
    private static string SheetName(string title)
    {
        var name = new string(title.Select(c => ":\\/?*[]".Contains(c) ? '-' : c).ToArray()).Trim();

        return name.Length == 0 ? "1" : name[..Math.Min(name.Length, MaxSheetNameLength)];
    }

    private static void PdfTable(TableDescriptor grid, ExportTable table)
    {
        grid.ColumnsDefinition(columns =>
        {
            foreach (var column in table.Columns)
                columns.RelativeColumn(column.Kind == ExportCellKind.Text ? 2 : 1);
        });
        grid.Header(header =>
        {
            foreach (var column in table.Columns)
                PdfCell(header.Cell().Background(Colors.Grey.Lighten3), column, column.Header, true, table.RightToLeft);
        });

        foreach (var row in table.Rows)
            for (var i = 0; i < table.Columns.Count; i++)
                PdfCell(grid.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2), table.Columns[i], Text(row.ElementAtOrDefault(i), table.Columns[i], table), false, table.RightToLeft);

        if (table.Totals.Count == 0)
            return;

        for (var i = 0; i < table.Columns.Count; i++)
            PdfCell(grid.Cell().Background(Colors.Grey.Lighten4), table.Columns[i], Text(table.Totals.ElementAtOrDefault(i), table.Columns[i], table), true, table.RightToLeft);
    }

    private static void CsvLine(StringBuilder csv, IEnumerable<string> cells)
    {
        csv.Append(string.Join(",", cells.Select(cell => cell.IndexOfAny([',', '"', '\r', '\n']) >= 0 ? "\"" + cell.Replace("\"", "\"\"") + "\"" : cell))).Append("\r\n");
    }

    // Formatted for reading: money with grouping and the money type's decimals, dates as DD-MM-YYYY.
    private static string Text(object? value, ExportColumn column, ExportTable table)
    {
        return value switch
        {
            null => string.Empty,
            decimal money when column.Kind == ExportCellKind.Money => money.ToString("N" + table.MoneyDecimals, CultureInfo.InvariantCulture),
            DateOnly date => date.ToString(DateFormat, CultureInfo.InvariantCulture),
            IFormattable number => number.ToString(null, CultureInfo.InvariantCulture),
            _ => value.ToString() ?? string.Empty
        };
    }

    // Money as a plain number (no grouping) so spreadsheets can sum it; text that starts like a formula is prefixed with ' (CSV injection).
    private static string CsvCell(object? value, ExportColumn column, ExportTable table)
    {
        if (value is decimal money && column.Kind == ExportCellKind.Money)
            return money.ToString("F" + table.MoneyDecimals, CultureInfo.InvariantCulture);

        var text = Text(value, column, table);

        return value is string && text.Length > 0 && "=+-@\t\r".Contains(text[0]) ? "'" + text : text;
    }

    private static void XlsxRow(IXLRow sheetRow, List<object?> values, ExportTable table, bool bold)
    {
        for (var i = 0; i < table.Columns.Count; i++)
        {
            var cell = sheetRow.Cell(i + 1);
            var value = values.ElementAtOrDefault(i);
            cell.Style.Font.Bold = bold;

            if (table.Columns[i].Align == ExportAlign.Center)
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

            switch (value)
            {
                case decimal number:
                    cell.SetValue(number);
                    cell.Style.NumberFormat.Format = table.Columns[i].Kind == ExportCellKind.Money && table.MoneyDecimals > 0 ? "#,##0." + new string('0', table.MoneyDecimals) : "#,##0";
                    break;
                case DateOnly date:
                    cell.SetValue(date.ToDateTime(TimeOnly.MinValue));
                    cell.Style.DateFormat.Format = ExcelDateFormat;
                    break;
                case int or long:
                    cell.SetValue(Convert.ToDecimal(value, CultureInfo.InvariantCulture));
                    break;
                case not null:
                    cell.SetValue(Text(value, table.Columns[i], table));
                    break;
            }
        }
    }

    // Start and End follow the reading direction, so in a right-to-left table Start is the right edge.
    private static void PdfCell(IContainer container, ExportColumn column, string text, bool bold, bool rightToLeft)
    {
        var padded = container.PaddingVertical(3).PaddingHorizontal(4);
        var aligned = column.Align switch
        {
            ExportAlign.Center => padded.AlignCenter(),
            ExportAlign.End => rightToLeft ? padded.AlignLeft() : padded.AlignRight(),
            _ => rightToLeft ? padded.AlignRight() : padded.AlignLeft()
        };
        var span = aligned.Text(text);

        if (bold)
            span.Bold();
    }

    #endregion
}
