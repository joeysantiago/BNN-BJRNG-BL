using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Contracts.Lookups;
using Thakurg.Domain.Common;

namespace Thakurg.Infrastructure.Repositories;

public class LookupRepository : ILookupRepository
{
    private readonly ICommonDbContext _dbContext;

    public LookupRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task<List<LookupItemDto>> GetCountriesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Countries.AsNoTracking().WhereActive().OrderBy(c => c.SortOrder).Select(c => new LookupItemDto { Id = c.Id, Code = c.Code, Name = c.Name }).ToListAsync(cancellationToken);
    }

    public Task<List<LookupItemDto>> GetCitiesAsync(int stateId, CancellationToken cancellationToken)
    {
        return _dbContext.Cities.AsNoTracking().WhereActive().Where(c => c.StateId == stateId).OrderBy(c => c.SortOrder).Select(c => new LookupItemDto { Id = c.Id, Name = c.Name }).ToListAsync(cancellationToken);
    }

    public Task<List<LookupItemDto>> GetStatesAsync(int countryId, CancellationToken cancellationToken)
    {
        return _dbContext.States.AsNoTracking().WhereActive().Where(s => s.CountryId == countryId).OrderBy(s => s.SortOrder).Select(s => new LookupItemDto { Id = s.Id, Code = s.Code, Name = s.Name }).ToListAsync(cancellationToken);
    }

    #endregion
}
