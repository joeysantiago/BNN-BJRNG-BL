using Thakurg.Contracts.Abstractions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

public interface IKhataContactService
{
    Task<string> DeleteAsync(KhataCallerDto caller, int contactId, CancellationToken cancellationToken);

    Task<string> DeletePhotoAsync(KhataCallerDto caller, int contactId, CancellationToken cancellationToken);

    Task<BookContactsDto> GetByBookAsync(KhataCallerDto caller, int bookId, CancellationToken cancellationToken);

    Task<FileStreamDto> OpenPhotoAsync(KhataCallerDto caller, int contactId, CancellationToken cancellationToken);

    Task<ContactNotifyDto> GetNotificationsAsync(KhataCallerDto caller, int contactId, CancellationToken cancellationToken);

    Task<ContactDto> UpdateAsync(KhataCallerDto caller, int contactId, ContactRequestDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<ContactDto>> SetPhotoAsync(KhataCallerDto caller, int contactId, PhotoUploadDto file, CancellationToken cancellationToken);

    Task<ContactDto> SetPermissionAsync(KhataCallerDto caller, int contactId, ContactPermissionRequestDto request, CancellationToken cancellationToken);

    Task<ContactDto> CreateAsync(KhataCallerDto caller, int bookId, ContactRequestDto request, Guid? idempotencyKey, CancellationToken cancellationToken);

    Task<ServiceResultDto<ContactNotifyDto>> SetNotificationsAsync(KhataCallerDto caller, int contactId, ContactNotifyDto request, CancellationToken cancellationToken);
}
