using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// A category the user chose for a merchant (TrackerCategoryRules): every later transaction of that merchant goes there.
public class TrackerCategoryRule : BaseEntity
{
    public int Id { get; set; }

    public int TrackerUserId { get; set; }

    public string MerchantKey { get; set; } = string.Empty;

    public string CategoryCode { get; set; } = string.Empty;
}
