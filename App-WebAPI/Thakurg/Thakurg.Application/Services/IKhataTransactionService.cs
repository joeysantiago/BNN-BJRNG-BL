using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

public interface IKhataTransactionService
{
    Task<string> DeleteAsync(KhataCallerDto caller, int transactionId, string? proof, CancellationToken cancellationToken);

    Task<List<TransactionHistoryDto>> GetHistoryAsync(KhataCallerDto caller, int transactionId, CancellationToken cancellationToken);

    Task<TransactionPageDto> GetPageAsync(KhataCallerDto caller, int contactId, int page, int? pageSize, CancellationToken cancellationToken);

    Task<TransactionDto> UpdateAsync(KhataCallerDto caller, int transactionId, TransactionRequestDto request, string? proof, CancellationToken cancellationToken);

    Task<TransactionDto> AddAsync(KhataCallerDto caller, int contactId, TransactionRequestDto request, Guid? idempotencyKey, CancellationToken cancellationToken);
}
