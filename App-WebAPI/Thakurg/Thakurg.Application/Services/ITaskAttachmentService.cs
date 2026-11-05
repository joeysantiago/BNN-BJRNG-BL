using Thakurg.Contracts.Abstractions;
using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface ITaskAttachmentService
{
    Task<FileStreamDto> OpenAsync(TaskCallerDto caller, int attachmentId, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskChangesDto>> RemoveAsync(TaskCallerDto caller, int attachmentId, CancellationToken cancellationToken);

    Task<ServiceResultDto<TaskChangesDto>> UploadAsync(TaskCallerDto caller, int taskId, List<TaskPhotoUploadDto> files, CancellationToken cancellationToken);
}
