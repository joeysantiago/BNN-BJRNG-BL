using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class KhataAuditLog : BaseEntity
{
    public int Id { get; set; }

    public int? BookId { get; set; }

    public int? UserId { get; set; }

    public int? ContactId { get; set; }

    public string? Details { get; set; }

    public string? RequestIp { get; set; }

    public string? UserAgent { get; set; }

    public string Action { get; set; } = string.Empty;
}
