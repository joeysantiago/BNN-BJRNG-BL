using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class KhataOtp : BaseEntity
{
    public int Id { get; set; }

    public byte Channel { get; set; }

    public int Attempts { get; set; }

    public string? RequestIp { get; set; }

    public DateTime ExpiresOn { get; set; }

    public DateTime? ConsumedOn { get; set; }

    public string CodeHash { get; set; } = string.Empty;

    public string Identifier { get; set; } = string.Empty;
}
