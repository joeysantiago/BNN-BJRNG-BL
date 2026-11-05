namespace Thakurg.Contracts.Configurations;

// Export in appsettings.json: the PDF page margin, text and title size, cell padding and row line width (points), and the longest Excel sheet name (Excel allows 31).
public class ExportOptions
{
    public int PdfMargin { get; set; }

    public int PdfFontSize { get; set; }

    public float PdfLineWidth { get; set; }

    public int PdfCellPadding { get; set; }

    public int SheetNameLength { get; set; }

    public int PdfTitleFontSize { get; set; }

    public const string SectionName = "Export";
}
