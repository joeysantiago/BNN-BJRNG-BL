using Thakurg.Contracts.Export;

namespace Thakurg.Application.Services;

// Turns a table into a PDF, CSV (UTF-8 with BOM) or Excel file.
public interface IExportService
{
    ExportFileDto Export(ExportTable table, ExportFormat format);
}
