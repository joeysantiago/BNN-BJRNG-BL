using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class KhataCurrency : BaseEntity
{
    public int Id { get; set; }

    public bool IsIso { get; set; }

    public byte Decimals { get; set; }

    public int SortOrder { get; set; }

    public int? OwnerUserId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Symbol { get; set; } = string.Empty;
}
