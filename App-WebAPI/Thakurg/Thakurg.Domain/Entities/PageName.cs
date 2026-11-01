using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class PageName : BaseEntity
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string PageCode { get; set; } = string.Empty;

    public string LanguageCode { get; set; } = string.Empty;
}
