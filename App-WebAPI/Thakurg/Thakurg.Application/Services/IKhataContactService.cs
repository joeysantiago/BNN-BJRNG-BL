using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

public interface IKhataContactService
{
    Task<BookContactsDto> GetByBookAsync(KhataCallerDto caller, int bookId, CancellationToken cancellationToken);

    Task<string> DeleteAsync(KhataCallerDto caller, int contactId, string? proof, CancellationToken cancellationToken);

    Task<ContactDto> UpdateAsync(KhataCallerDto caller, int contactId, ContactRequestDto request, CancellationToken cancellationToken);

    Task<ContactDto> CreateAsync(KhataCallerDto caller, int bookId, ContactRequestDto request, Guid? idempotencyKey, CancellationToken cancellationToken);

    Task<ContactDto> SetPermissionAsync(KhataCallerDto caller, int contactId, ContactPermissionRequestDto request, string? proof, CancellationToken cancellationToken);
}
