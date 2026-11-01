using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class App : BaseEntity
{
    public int Id { get; set; }

    public int SortOrder { get; set; }

    public bool AutoGrant { get; set; }

    public string Code { get; set; } = string.Empty;
}
