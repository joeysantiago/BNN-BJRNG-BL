using Thakurg.Contracts.Export;
using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

public interface IKhataExportService
{
    Task<ExportFileDto> ExportContactsAsync(KhataCallerDto caller, int bookId, string? format, CancellationToken cancellationToken);

    Task<ExportFileDto> ExportBookEntriesAsync(KhataCallerDto caller, int bookId, TransactionQueryDto query, string? format, CancellationToken cancellationToken);

    Task<ExportFileDto> ExportContactEntriesAsync(KhataCallerDto caller, int contactId, TransactionQueryDto query, string? format, CancellationToken cancellationToken);
}
