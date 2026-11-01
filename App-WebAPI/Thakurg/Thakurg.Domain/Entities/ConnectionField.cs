using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class ConnectionField : BaseEntity
{
    public int Id { get; set; }

    public int SortOrder { get; set; }

    public bool IsEnabled { get; set; }

    public string Code { get; set; } = string.Empty;
}
