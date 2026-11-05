using Thakurg.Contracts.Lookups;

namespace Thakurg.Application.Services;

public interface ILookupService
{
    Task<List<LookupItemDto>> GetCountriesAsync(CancellationToken cancellationToken);

    Task<List<LookupItemDto>> GetCitiesAsync(int stateId, CancellationToken cancellationToken);

    Task<List<LookupItemDto>> GetStatesAsync(int countryId, CancellationToken cancellationToken);
}
