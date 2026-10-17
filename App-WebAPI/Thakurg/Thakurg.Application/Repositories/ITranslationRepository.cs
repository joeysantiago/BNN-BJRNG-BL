using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface ITranslationRepository
{
    Task<List<PageTranslation>> GetActiveAsync(CancellationToken cancellationToken);
}
