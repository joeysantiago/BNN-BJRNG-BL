using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

public interface IKhataContactService
{
    Task<string> DeleteAsync(KhataCallerDto caller, int contactId, CancellationToken cancellationToken);

    Task<BookContactsDto> GetByBookAsync(KhataCallerDto caller, int bookId, CancellationToken cancellationToken);

    Task<ContactDto> UpdateAsync(KhataCallerDto caller, int contactId, ContactRequestDto request, CancellationToken cancellationToken);

    Task<ContactDto> SetPermissionAsync(KhataCallerDto caller, int contactId, ContactPermissionRequestDto request, CancellationToken cancellationToken);

    Task<ContactDto> CreateAsync(KhataCallerDto caller, int bookId, ContactRequestDto request, Guid? idempotencyKey, CancellationToken cancellationToken);
}
