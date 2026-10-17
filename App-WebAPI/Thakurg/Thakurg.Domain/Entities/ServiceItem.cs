using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class ServiceItem : BaseEntity
{
    public int Id { get; set; }

    public int SortOrder { get; set; }

    public bool IsEnabled { get; set; }

    public string? ProbeUrl { get; set; }

    public string? StatusPageUrl { get; set; }

    public string Url { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string GroupCode { get; set; } = string.Empty;
}
