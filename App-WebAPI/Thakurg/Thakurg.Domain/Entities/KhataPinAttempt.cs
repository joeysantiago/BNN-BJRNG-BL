using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class KhataPinAttempt : BaseEntity
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public bool Success { get; set; }

    public byte Purpose { get; set; }

    public int? SessionId { get; set; }

    public string? RequestIp { get; set; }
}
