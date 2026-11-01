using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class KhataBook : BaseEntity
{
    public int Id { get; set; }

    public int SortOrder { get; set; }

    public int CurrencyId { get; set; }

    public int OwnerUserId { get; set; }

    public string Name { get; set; } = string.Empty;
}
