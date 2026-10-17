using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class TranslationRepository : ITranslationRepository
{
    private readonly ICommonDbContext _dbContext;

    public TranslationRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task<List<PageTranslation>> GetActiveAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Translations.AsNoTracking().WhereActive().OrderBy(t => t.Id).ToListAsync(cancellationToken);
    }

    #endregion
}
