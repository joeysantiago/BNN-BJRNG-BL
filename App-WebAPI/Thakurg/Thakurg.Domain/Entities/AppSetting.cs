using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class AppSetting : BaseEntity
{
    public int Id { get; set; }

    public string? Description { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Value { get; set; } = string.Empty;
}
