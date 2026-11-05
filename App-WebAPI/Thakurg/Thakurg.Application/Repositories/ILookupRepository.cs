using Thakurg.Contracts.Lookups;

namespace Thakurg.Application.Repositories;

// The address choices (Countries, States, Cities): active, not deleted rows only, in their sort order.
public interface ILookupRepository
{
    Task<List<LookupItemDto>> GetCountriesAsync(CancellationToken cancellationToken);

    Task<List<LookupItemDto>> GetCitiesAsync(int stateId, CancellationToken cancellationToken);

    Task<List<LookupItemDto>> GetStatesAsync(int countryId, CancellationToken cancellationToken);
}
