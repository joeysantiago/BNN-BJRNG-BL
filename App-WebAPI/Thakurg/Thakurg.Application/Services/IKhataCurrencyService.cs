using Thakurg.Contracts.Khata;

namespace Thakurg.Application.Services;

public interface IKhataCurrencyService
{
    Task<List<CurrencyDto>> GetAllAsync(KhataCallerDto caller, CancellationToken cancellationToken);

    Task<string> DeleteAsync(KhataCallerDto caller, int currencyId, CancellationToken cancellationToken);

    Task<CurrencyDto> AddAsync(KhataCallerDto caller, CurrencyRequestDto request, CancellationToken cancellationToken);

    Task<CurrencyDto> UpdateAsync(KhataCallerDto caller, int currencyId, CurrencyRequestDto request, CancellationToken cancellationToken);
}
