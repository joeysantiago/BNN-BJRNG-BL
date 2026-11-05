using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Lookups;

namespace Thakurg.Infrastructure.Services;

// The address dropdowns of the Profile page: countries, the states of a country, the cities of a state (master data, seeded with India).
public class LookupService : ILookupService
{
    private readonly ILookupRepository _lookupRepository;

    public LookupService(ILookupRepository lookupRepository)
    {
        _lookupRepository = lookupRepository;
    }

    #region Public Methods

    public Task<List<LookupItemDto>> GetCountriesAsync(CancellationToken cancellationToken)
    {
        return _lookupRepository.GetCountriesAsync(cancellationToken);
    }

    public Task<List<LookupItemDto>> GetCitiesAsync(int stateId, CancellationToken cancellationToken)
    {
        return _lookupRepository.GetCitiesAsync(stateId, cancellationToken);
    }

    public Task<List<LookupItemDto>> GetStatesAsync(int countryId, CancellationToken cancellationToken)
    {
        return _lookupRepository.GetStatesAsync(countryId, cancellationToken);
    }

    #endregion
}
