namespace Thakurg.Contracts.Export;

public class ExportColumn
{
    public ExportAlign Align { get; set; }

    public ExportCellKind Kind { get; set; }

    public string Header { get; set; } = string.Empty;
}
