using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class Page : BaseEntity
{
    public int Id { get; set; }

    public bool HasAdd { get; set; }

    public int SortOrder { get; set; }

    public bool HasDelete { get; set; }

    public string Code { get; set; } = string.Empty;
}
