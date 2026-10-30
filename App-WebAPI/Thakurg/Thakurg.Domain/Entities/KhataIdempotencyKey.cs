using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class KhataIdempotencyKey : BaseEntity
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public DateTime ExpiresOn { get; set; }

    public int ResponseStatus { get; set; }

    public Guid IdempotencyKey { get; set; }

    public string? ResponseBody { get; set; }

    public string Endpoint { get; set; } = string.Empty;

    public string RequestHash { get; set; } = string.Empty;
}
