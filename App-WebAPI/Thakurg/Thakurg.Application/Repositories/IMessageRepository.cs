using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IMessageRepository
{
    Task<List<Message>> GetAllAsync(CancellationToken cancellationToken);
}
