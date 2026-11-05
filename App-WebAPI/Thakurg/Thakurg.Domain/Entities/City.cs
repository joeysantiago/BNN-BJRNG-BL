using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// A row of the Cities table: the choices of the address on the Profile page (seeded with India).
public class City : BaseEntity
{
    public int Id { get; set; }

    public int StateId { get; set; }

    public int SortOrder { get; set; }

    public string Name { get; set; } = string.Empty;
}
