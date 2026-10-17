using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class PageTranslation : BaseEntity
{
    public int Id { get; set; }

    public string Eng { get; set; } = string.Empty;

    public string Hin { get; set; } = string.Empty;

    public string Arab { get; set; } = string.Empty;

    public string PageCode { get; set; } = string.Empty;
}
