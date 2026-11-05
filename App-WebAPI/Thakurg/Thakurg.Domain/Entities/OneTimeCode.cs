using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// A one-time login code (OneTimeCodes). Only its keyed hash is stored; ConsumedOn is set when it is used, Attempts counts the wrong tries.
public class OneTimeCode : BaseEntity
{
    public int Id { get; set; }

    public int Attempts { get; set; }

    public string? RequestIp { get; set; }

    public DateTime ExpiresOn { get; set; }

    public DateTime? ConsumedOn { get; set; }

    public string AppCode { get; set; } = string.Empty;

    public string Channel { get; set; } = string.Empty;

    public string CodeHash { get; set; } = string.Empty;

    public string Destination { get; set; } = string.Empty;
}
