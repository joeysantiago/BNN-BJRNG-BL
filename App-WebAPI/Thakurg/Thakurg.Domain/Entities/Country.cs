using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// A row of the Countries table: the choices of the address on the Profile page (seeded with India).
public class Country : BaseEntity
{
    public int Id { get; set; }

    public int SortOrder { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}
