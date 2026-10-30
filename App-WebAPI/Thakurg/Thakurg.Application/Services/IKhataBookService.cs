using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

public interface IKhataBookService
{
    Task<List<BookDto>> GetAllAsync(KhataCallerDto caller, CancellationToken cancellationToken);

    Task<BookDto> OpenAsync(KhataCallerDto caller, int bookId, CancellationToken cancellationToken);

    Task<string> DeleteAsync(KhataCallerDto caller, int bookId, string? proof, CancellationToken cancellationToken);

    Task<BookDto> UpdateAsync(KhataCallerDto caller, int bookId, BookRequestDto request, CancellationToken cancellationToken);

    Task<BookDto> CreateAsync(KhataCallerDto caller, BookRequestDto request, Guid? idempotencyKey, CancellationToken cancellationToken);
}
