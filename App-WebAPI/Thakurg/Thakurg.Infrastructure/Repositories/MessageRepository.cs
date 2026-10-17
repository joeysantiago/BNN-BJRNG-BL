using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class MessageRepository : IMessageRepository
{
    private readonly ICommonDbContext _dbContext;

    public MessageRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public Task<List<Message>> GetAllAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Messages.AsNoTracking().WhereActive().ToListAsync(cancellationToken);
    }

    #endregion
}
