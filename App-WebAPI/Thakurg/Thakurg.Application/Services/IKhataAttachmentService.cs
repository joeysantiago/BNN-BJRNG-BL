using Thakurg.Contracts.Abstractions;
using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

public interface IKhataAttachmentService
{
    Task<string> DeleteAsync(KhataCallerDto caller, int attachmentId, CancellationToken cancellationToken);

    Task<FileStreamDto> OpenAsync(KhataCallerDto caller, int attachmentId, CancellationToken cancellationToken);

    Task<List<AttachmentDto>> UploadAsync(KhataCallerDto caller, int transactionId, List<PhotoUploadDto> files, CancellationToken cancellationToken);
}
